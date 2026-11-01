-- ─── Price Snapshots Table ───────────────────────────────────────────────────────
-- Stores daily market price snapshots for historical analysis and trend tracking

CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  exchange TEXT NOT NULL CHECK (exchange IN ('PSX', 'NSE')),
  price NUMERIC NOT NULL,
  change NUMERIC,
  change_percent NUMERIC,
  currency TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one snapshot per ticker per day per org
  UNIQUE(org_id, ticker, exchange, snapshot_date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_price_snapshots_org_date ON public.price_snapshots(org_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_ticker_date ON public.price_snapshots(ticker, exchange, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_snapshot_date ON public.price_snapshots(snapshot_date DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_price_snapshots_updated_at
  BEFORE UPDATE ON public.price_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only see their own org's price snapshots
CREATE POLICY "Users can view own org price snapshots"
  ON public.price_snapshots FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- Users can insert price snapshots for their own org
CREATE POLICY "Users can insert own org price snapshots"
  ON public.price_snapshots FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- Comments
COMMENT ON TABLE public.price_snapshots IS 'Daily market price snapshots for portfolio valuation and historical analysis';
COMMENT ON COLUMN public.price_snapshots.price IS 'Current market price of the ticker';
COMMENT ON COLUMN public.price_snapshots.change IS 'Price change from previous close';
COMMENT ON COLUMN public.price_snapshots.change_percent IS 'Percentage change from previous close';
COMMENT ON COLUMN public.price_snapshots.snapshot_date IS 'The date of the price snapshot (YYYY-MM-DD)';
