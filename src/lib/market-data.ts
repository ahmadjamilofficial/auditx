// ─── Live Market Data Service ───────────────────────────────────────────────
// Fetches real-time stock prices from Yahoo Finance via a proxy
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

// ─── Fetch single ticker price from Yahoo Finance ───────────────────────────

async function fetchYahooPrice(ticker: string): Promise<TickerQuote | null> {
  try {
    // Use a CORS proxy to avoid browser restrictions
    const proxyUrl = "https://query1.finance.yahoo.com/v8/finance/chart/";
    const response = await fetch(`${proxyUrl}${ticker}?interval=1d&range=1d`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    const quote = result?.indicators?.quote?.[0];

    if (!meta || !quote) return null;

    const latestPrice = quote.close?.[quote.close.length - 1] || meta.regularMarketPrice;
    const prevClose = meta.previousClose || quote.open?.[0];

    if (!latestPrice || prevClose === undefined) return null;

    const change = latestPrice - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol: meta.symbol,
      regularMarketPrice: latestPrice,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      currency: meta.currency || "USD",
      marketState: meta.marketState || "CLOSED",
    };
  } catch (error) {
    console.error(`[MarketData] Failed to fetch price for ${ticker}:`, error);
    return null;
  }
}

// ─── Normalize ticker symbols for Yahoo Finance ─────────────────────────────

function normalizeTicker(ticker: string, exchange: "PSX" | "NSE"): string {
  // NSE tickers need .NS suffix
  if (exchange === "NSE") {
    return `${ticker}.NS`;
  }
  // PSX tickers might need .KAR suffix, but many work without
  // Try without suffix first, then with
  return ticker;
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

  // Fetch uncached prices
  const uncached = tickers.filter(
    ({ ticker, exchange }) => {
      const key = `${exchange}:${ticker}`;
      const cached = PRICE_CACHE.get(key);
      return !cached || cached.expires <= now;
    },
  );

  // Fetch in parallel with delay to avoid rate limiting
  for (const { ticker, exchange } of uncached) {
    const normalized = normalizeTicker(ticker, exchange);
    const quote = await fetchYahooPrice(normalized);

    if (quote) {
      const currency = exchange === "NSE" ? "INR" : "PKR";
      const marketPrice: MarketPrice = {
        ticker,
        exchange,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        currency,
        lastUpdated: new Date().toISOString(),
      };

      const key = `${exchange}:${ticker}`;
      prices.set(key, marketPrice);
      PRICE_CACHE.set(key, { data: marketPrice, expires: now + CACHE_TTL });
    }

    // Add small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
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

// ─── Server-side price fetch (for background jobs) ───────────────────────────

export async function fetchMarketPricesServer(
  tickers: Array<{ ticker: string; exchange: "PSX" | "NSE" }>,
): Promise<Map<string, MarketPrice>> {
  // Same logic as client-side, but can be called from Edge Functions
  return fetchMarketPrices(tickers);
}

// ─── Store daily price snapshots in database for historical analysis ─────────

export async function storePriceSnapshot(
  orgId: string,
  prices: MarketPrice[],
): Promise<void> {
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
    console.error("[MarketData] Failed to store price snapshot:", error);
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
