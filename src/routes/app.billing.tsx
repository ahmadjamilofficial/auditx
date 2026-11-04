import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, CreditCard, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Btn, Panel, StatusPill, reveal } from "@/components/kit";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/billing")({
  component: Billing,
});

const plans = [
  {
    name: "Standard",
    price: "$3",
    monthlyPrice: 3,
    note: "For individuals who need intelligent financial assistance",
    popular: false,
    trialDays: 7,
    kelviqPlan: "standard-plan",
    items: [
      "Natural AI conversations",
      "Agentic financial assistance",
      "Persistent memory",
      "Transaction analysis",
      "Document analysis",
      "Core audit tools",
      "Light and dark themes",
      "Standard integrations",
    ],
  },
  {
    name: "Pro",
    price: "$5",
    monthlyPrice: 5,
    note: "For advanced users and businesses requiring more powerful automation",
    popular: true,
    trialDays: 7,
    kelviqPlan: "pro-plan",
    items: [
      "Everything in Standard",
      "Advanced agent workflows",
      "More integrations",
      "Advanced reconciliation",
      "Automated reporting",
      "Background agent tasks",
      "Advanced spreadsheet operations",
      "Priority processing",
    ],
  },
];

interface PlanLimits {
  plan: string;
  status: string;
  can_use_ai: boolean;
  can_use_background_tasks: boolean;
  can_use_advanced_integrations: boolean;
  trial_ends_at: string | null;
}

const CHECKOUT_FALLBACK =
  "https://www.kelviq.com/buy/ac42e10b-db2e-44ca-b212-6d4f0429b6e3/?enabled=pro-plan%2Cstandard-plan&plan_identifier=pro-plan&charge_period=MONTHLY";

function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function Billing() {
  const { profile } = useAuth();
  const [limits, setLimits] = useState<PlanLimits | null>(null);

  const checkoutUrl = import.meta.env["VITE_KELVIQ_CHECKOUT_URL"] || CHECKOUT_FALLBACK;
  const portalUrl = import.meta.env["VITE_KELVIQ_PORTAL_URL"] as string | undefined;

  // Real subscription state from the database, not a client-side guess.
  useEffect(() => {
    let alive = true;
    const orgId = profile?.org_id;
    if (!orgId) return;
    void (async () => {
      const { data } = await supabase.rpc("get_user_plan_limits", { org_id_param: orgId });
      if (!alive) return;
      const row = (Array.isArray(data) ? data[0] : data) as PlanLimits | null;
      if (row) setLimits(row);
    })();
    return () => {
      alive = false;
    };
  }, [profile?.org_id]);

  const currentPlan = (limits?.plan ?? profile?.plan ?? "standard").toLowerCase();
  const status = limits?.status ?? profile?.plan_status ?? "trialing";
  const trialDays = daysLeft(limits?.trial_ends_at ?? null);
  const onTrial = status === "trialing" && (trialDays === null || trialDays > 0);
  const trialExpired = status === "trialing" && trialDays === 0;

  function urlFor(plan: (typeof plans)[number]) {
    return checkoutUrl.replace(/plan_identifier=[a-z-]+/, `plan_identifier=${plan.kelviqPlan}`);
  }

  function handleManagePayment() {
    if (portalUrl) {
      window.open(portalUrl, "_blank", "noopener");
      return;
    }
    // No customer-portal URL configured: send the user to the checkout page
    // where Kelviq lets them manage the existing subscription.
    window.open(urlFor(plans.find((p) => p.name.toLowerCase() === currentPlan) ?? plans[0]!), "_blank", "noopener");
    toast.info("Opened Kelviq checkout — manage or cancel your subscription there.");
  }

  function handleStartTrial(plan: (typeof plans)[number]) {
    window.open(urlFor(plan), "_blank", "noopener");
    toast.info(`Opening secure checkout for the ${plan.name} plan (7-day free trial).`);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem" }}>Billing</h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
          Manage your plan, usage and payment details.
        </p>
      </div>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>CURRENT PLAN</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xl font-semibold capitalize">{currentPlan}</p>
              <StatusPill tone={onTrial ? "info" : trialExpired ? "bad" : "ok"}>
                {onTrial
                  ? trialDays === null
                    ? "Free trial"
                    : `Free trial · ${trialDays} day${trialDays === 1 ? "" : "s"} left`
                  : trialExpired
                    ? "Trial ended"
                    : "Active"}
              </StatusPill>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              {currentPlan === "pro" ? "$5/month" : "$3/month"}
              {onTrial ? " · free until your trial ends, then billed monthly" : " · billed monthly"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={handleManagePayment}>
              <CreditCard size={15} strokeWidth={1.75} />
              Manage payment
            </Btn>
          </div>
        </div>
      </Panel>

      {/* Free trial — always visible, with real days remaining */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4"
        style={{ background: "var(--accent-6)", border: "1px solid var(--accent-15)" }}
      >
        <div className="flex items-start gap-3">
          <Sparkles size={16} strokeWidth={1.75} style={{ color: "var(--color-accent)", marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold">
              {onTrial
                ? trialDays === null
                  ? "You're on the 7-day free trial"
                  : `7-day free trial — ${trialDays} day${trialDays === 1 ? "" : "s"} remaining`
                : "Start your 7-day free trial"}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
              Every plan starts with 7 free days. Cancel any time before the trial ends and you are not charged.
            </p>
          </div>
        </div>
        <Btn
          variant="primary"
          onClick={() => handleStartTrial(plans.find((p) => p.name.toLowerCase() === currentPlan) ?? plans[0]!)}
        >
          {onTrial ? "Manage trial" : trialExpired ? "Resume with free trial" : "Start free trial"}
        </Btn>
      </div>

      <div>
        <p className="mb-4 text-sm font-semibold">Available Plans</p>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={reveal}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Panel
                style={
                  plan.popular
                    ? { border: "2px solid var(--color-accent)", boxShadow: "var(--shadow-hover)" }
                    : {}
                }
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{plan.name}</p>
                  {plan.popular && <StatusPill tone="info">Most popular</StatusPill>}
                </div>
                <p className="tnum mt-3 text-2xl font-semibold">
                  {plan.price}
                  {plan.name !== "Free" && (
                    <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>
                      /mo
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>{plan.note}</p>
                <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <BadgeCheck size={15} strokeWidth={1.75} style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 1 }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Btn
                  variant={currentPlan === plan.name.toLowerCase() ? "secondary" : plan.popular ? "primary" : "secondary"}
                  className="mt-5 w-full"
                  disabled={currentPlan === plan.name.toLowerCase() && !trialExpired}
                  onClick={() => {
                    if (currentPlan !== plan.name.toLowerCase() || trialExpired) handleStartTrial(plan);
                  }}
                >
                  {currentPlan === plan.name.toLowerCase() && !trialExpired
                    ? onTrial
                      ? "Current plan · on free trial"
                      : "Current plan"
                    : plan.trialDays
                      ? `Start ${plan.trialDays}-day free trial`
                      : `Upgrade to ${plan.name}`}
                </Btn>
              </Panel>
            </motion.div>
          ))}
        </div>
      </div>

<div
        className="flex items-start gap-2.5 rounded-2xl px-5 py-4 text-sm"
        style={{ background: "var(--accent-6)", border: "1px solid var(--accent-15)" }}
      >
        <ArrowUpRight size={15} strokeWidth={1.75} style={{ color: "var(--color-accent)", marginTop: 2, flexShrink: 0 }} />
        <p style={{ color: "var(--ink-2)" }}>
          <strong>Subscription:</strong> Wab now uses a simple subscription model. Choose Standard ($3/mo) or Pro ($5/mo). Both plans include a 7-day free trial. Your subscription is managed securely through Kelviq.
        </p>
      </div>
    </div>
  );
}
