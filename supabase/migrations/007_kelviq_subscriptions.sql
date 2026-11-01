-- ─── AuditX: Kelviq Subscription System ─────────────────────────────────────────
-- Implements subscription-based access with Kelviq payment integration
-- Replaces credit system with Standard ($3/mo) and Pro ($5/mo) plans
-- Run in Supabase Dashboard → SQL Editor. Safe to run multiple times.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. subscriptions — Kelviq subscription records
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop existing table if it exists with different schema
DROP TABLE IF EXISTS public.subscriptions CASCADE;

CREATE TABLE public.subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kelviq_customer_id  text,                        -- Kelviq customer ID
  kelviq_subscription_id text UNIQUE,             -- Kelviq subscription ID
  plan                text NOT NULL CHECK (plan IN ('standard', 'pro')),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
  charge_period       text NOT NULL DEFAULT 'MONTHLY' CHECK (charge_period IN ('MONTHLY', 'YEARLY')),
  trial_end_at        timestamptz,                 -- When trial ends (if applicable)
  current_period_end  timestamptz,                 -- Current billing period end
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at        timestamptz,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_org_idx ON public.subscriptions (org_id);
CREATE INDEX subscriptions_kelviq_idx ON public.subscriptions (kelviq_subscription_id);
CREATE INDEX subscriptions_status_idx ON public.subscriptions (status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_subscriptions" ON public.subscriptions;
CREATE POLICY "org_select_subscriptions"
  ON public.subscriptions FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "service_insert_subscriptions" ON public.subscriptions;
CREATE POLICY "service_insert_subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (true); -- Webhook/worker inserts bypass RLS

DROP POLICY IF EXISTS "service_update_subscriptions" ON public.subscriptions;
CREATE POLICY "service_update_subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (true); -- Webhook/worker updates bypass RLS

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. subscription_events — Kelviq webhook events (for audit/verification)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  subscription_id     uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  kelviq_event_id     text UNIQUE,                 -- Kelviq event ID for deduplication
  event_type          text NOT NULL,               -- e.g., "subscription.created", "payment.succeeded"
  event_data          jsonb NOT NULL,               -- Full Kelviq webhook payload
  processed           boolean NOT NULL DEFAULT false,
  processed_at        timestamptz,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_events_kelviq_idx ON public.subscription_events (kelviq_event_id);
CREATE INDEX IF NOT EXISTS subscription_events_subscription_idx ON public.subscription_events (subscription_id);
CREATE INDEX IF NOT EXISTS subscription_events_processed_idx ON public.subscription_events (processed, created_at);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_insert_subscription_events" ON public.subscription_events;
CREATE POLICY "service_insert_subscription_events"
  ON public.subscription_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_update_subscription_events" ON public.subscription_events;
CREATE POLICY "service_update_subscription_events"
  ON public.subscription_events FOR UPDATE
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Helper function: Update subscription updated_at
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helper function: Get or create subscription for an org
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_subscription(org_id_param uuid)
RETURNS public.subscriptions AS $$
DECLARE
  sub_record public.subscriptions;
BEGIN
  -- Try to get existing subscription
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE org_id = org_id_param
  AND status IN ('active', 'trialing')
  LIMIT 1;

  -- If no active subscription, create a free trial subscription
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (org_id, plan, status, trial_end_at)
    VALUES (org_id_param, 'standard', 'trialing', now() + interval '7 days')
    RETURNING * INTO sub_record;
  END IF;

  RETURN sub_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Helper function: Check if user has active subscription
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_active_subscription(org_id_param uuid)
RETURNS boolean AS $$
DECLARE
  has_sub boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions
    WHERE org_id = org_id_param
    AND status IN ('active', 'trialing')
    AND (trial_end_at IS NULL OR trial_end_at > now())
  ) INTO has_sub;

  RETURN has_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Helper function: Get user's plan and limits
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(org_id_param uuid)
RETURNS TABLE(
  plan text,
  status text,
  can_use_ai boolean,
  can_use_background_tasks boolean,
  can_use_advanced_integrations boolean,
  trial_ends_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.plan, 'standard')::text,
    COALESCE(s.status, 'trialing')::text,
    (s.status IN ('active', 'trialing') AND (s.trial_end_at IS NULL OR s.trial_end_at > now()))::boolean,
    (s.plan = 'pro' AND s.status IN ('active', 'trialing'))::boolean,
    (s.plan = 'pro' AND s.status IN ('active', 'trialing'))::boolean,
    s.trial_end_at
  FROM public.subscriptions s
  WHERE s.org_id = org_id_param
  AND s.status IN ('active', 'trialing')
  LIMIT 1;

  -- If no subscription found, return default trial values
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'standard'::text,
      'trialing'::text,
      true::boolean,
      false::boolean,
      false::boolean,
      now() + interval '7 days'::timestamptz;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Plan pricing reference (for UI display)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_pricing (
  plan              text PRIMARY KEY CHECK (plan IN ('standard', 'pro')),
  name              text NOT NULL,
  monthly_price     integer NOT NULL,              -- Price in cents (e.g., 300 = $3.00)
  yearly_price      integer NOT NULL,              -- Price in cents (e.g., 30 = $30.00)
  trial_days        integer NOT NULL DEFAULT 7,
  features          jsonb NOT NULL DEFAULT '[]'::jsonb,
  kelviq_plan_id   text NOT NULL,                 -- Kelviq plan identifier
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Seed plan pricing
INSERT INTO public.plan_pricing (plan, name, monthly_price, yearly_price, trial_days, features, kelviq_plan_id)
VALUES
  ('standard', 'Standard', 300, 3000, 7,
   '["Natural AI conversations", "Agentic financial assistance", "Persistent memory", "Transaction analysis", "Document analysis", "Core audit tools", "Light and dark themes", "Standard integrations"]'::jsonb,
   'standard-plan'),
  ('pro', 'Pro', 500, 5000, 7,
   '["Everything in Standard", "Advanced agent workflows", "More integrations", "Advanced reconciliation", "Automated reporting", "Background agent tasks", "Advanced spreadsheet operations", "Priority processing"]'::jsonb,
   'pro-plan')
ON CONFLICT (plan) DO UPDATE
  SET name = EXCLUDED.name,
      monthly_price = EXCLUDED.monthly_price,
      yearly_price = EXCLUDED.yearly_price,
      trial_days = EXCLUDED.trial_days,
      features = EXCLUDED.features,
      kelviq_plan_id = EXCLUDED.kelviq_plan_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done
-- ─────────────────────────────────────────────────────────────────────────────
