// ─── Live Market Data Service ───────────────────────────────────────────────
// Fetches real-time stock prices from server-side API to avoid CORS issues
// This enables accurate portfolio valuation and unrealized P&L calculations

import { supabase } from "./supabase";

export interface MarketPrice {
  ticker: string;
  exchange: "PSX" | "NSE";
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
}

export interface TickerQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  marketState: "REGULAR" | "CLOSED" | "PRE" | "POST";
}

// Cache prices for 5 minutes to avoid rate limiting
const PRICE_CACHE = new Map<string, { data: MarketPrice; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Fetch market prices from server-side API ───────────────────────────────

async function fetchFromServer(
  tickers: Array<{ ticker: string; exchange: "PSX" | "NSE" }>,
): Promise<Map<string, MarketPrice>> {
  try {
    const response = await fetch("/api/market-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers }),
    });

    if (!response.ok) {
      return new Map();
    }

    const data = await response.json();
    const prices = new Map<string, MarketPrice>();

    for (const price of data.prices || []) {
      const key = `${price.exchange}:${price.ticker}`;
      prices.set(key, price);
    }

    return prices;
  } catch (error) {
    return new Map();
  }
}

// ─── Fetch multiple ticker prices (batched) ─────────────────────────────────

export async function fetchMarketPrices(
  tickers: Array<{ ticker: string; exchange: "PSX" | "NSE" }>,
): Promise<Map<string, MarketPrice>> {
  const prices = new Map<string, MarketPrice>();
  const now = Date.now();

  // Return cached prices if still valid
  for (const { ticker, exchange } of tickers) {
    const key = `${exchange}:${ticker}`;
    const cached = PRICE_CACHE.get(key);
    if (cached && cached.expires > now) {
      prices.set(key, cached.data);
    }
  }

  // Fetch uncached prices from server
  const uncached = tickers.filter(({ ticker, exchange }) => {
    const key = `${exchange}:${ticker}`;
    const cached = PRICE_CACHE.get(key);
    return !cached || cached.expires <= now;
  });

  if (uncached.length > 0) {
    const serverPrices = await fetchFromServer(uncached);

    for (const { ticker, exchange } of uncached) {
      const key = `${exchange}:${ticker}`;
      const price = serverPrices.get(key);

      if (price) {
        prices.set(key, price);
        PRICE_CACHE.set(key, { data: price, expires: now + CACHE_TTL });
      }
    }
  }

  return prices;
}

// ─── Fetch single ticker price ───────────────────────────────────────────────

export async function fetchMarketPrice(
  ticker: string,
  exchange: "PSX" | "NSE",
): Promise<MarketPrice | null> {
  const prices = await fetchMarketPrices([{ ticker, exchange }]);
  return prices.get(`${exchange}:${ticker}`) || null;
}

// ─── Get cached price without network call ───────────────────────────────────

export function getCachedPrice(ticker: string, exchange: "PSX" | "NSE"): MarketPrice | null {
  const key = `${exchange}:${ticker}`;
  const cached = PRICE_CACHE.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}

// ─── Store daily price snapshots in database for historical analysis ─────────

export async function storePriceSnapshot(orgId: string, prices: MarketPrice[]): Promise<void> {
  const { error } = await supabase.from("price_snapshots").insert(
    prices.map((p) => ({
      org_id: orgId,
      ticker: p.ticker,
      exchange: p.exchange,
      price: p.price,
      change: p.change,
      change_percent: p.changePercent,
      currency: p.currency,
      snapshot_date: new Date().toISOString().split("T")[0],
    })),
  );

  if (error) {
    // Silent error handling
  }
}

// ─── Get historical price for a specific date ─────────────────────────────────

export async function getHistoricalPrice(
  ticker: string,
  exchange: "PSX" | "NSE",
  date: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("price_snapshots")
    .select("price")
    .eq("ticker", ticker)
    .eq("exchange", exchange)
    .eq("snapshot_date", date)
    .maybeSingle();

  if (error || !data) return null;
  return data.price as number;
}
