// ─── Provider adapters (server only) ─────────────────────────────────────────
// Every adapter talks to a real endpoint. Nothing here fabricates data: when a
// provider refuses, calls time out, or credentials are missing, the adapter
// throws or returns ok:false and the connection is NOT marked connected.

import { createHmac, createHash } from "node:crypto";
import type {
  AdapterContext,
  AdapterTestResult,
  NormalizedAccount,
  NormalizedTransaction,
  ProviderAdapter,
  TransactionKind,
} from "./types";

const TIMEOUT_MS = 15_000;

async function requestJson(
  url: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Deterministic, provider-independent identity for a normalized record. */
export function transactionDedupeKey(provider: string, externalId: string): string {
  return createHash("sha256").update(`${provider}:${externalId}`).digest("hex");
}

// ═══════════════════════════════════════════════════════════════════════════
// CSV statement import — deterministic, credential-free fallback importer
// ═══════════════════════════════════════════════════════════════════════════

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length < 2) return [];
  const header = nonEmpty[0]!.map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((cells) => {
    const out: Record<string, string> = {};
    header.forEach((key, idx) => {
      if (key) out[key] = (cells[idx] ?? "").trim();
    });
    return out;
  });
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

export const csvImportAdapter: ProviderAdapter = {
  id: "csv_import",
  label: "Statement import (CSV)",
  category: "import",
  summary: "Deterministic CSV import for broker or exchange exports.",
  capabilities: ["Normalize trades, cash movements and fees", "Idempotent re-import"],
  requiresCredentials: false,
  credentialFields: [],
  configFields: [],
  async test(ctx: AdapterContext): Promise<AdapterTestResult> {
    const rows = parseCsv(ctx.config["csv"] ?? "");
    if (!rows.length) {
      return { ok: false, message: "No data rows found. A header row plus at least one row is required." };
    }
    const hasDate = rows.every((r) => Boolean(pick(r, ["date", "trade_date", "occurred_at", "time"])));
    return {
      ok: true,
      message: `Parsed ${rows.length} row${rows.length === 1 ? "" : "s"}.`,
      permissions: { read: true, trade: false, withdraw: false },
      ...(hasDate ? {} : { warnings: ["Some rows have no date column; they will be skipped during sync."] }),
    };
  },
  async fetchAccounts(): Promise<NormalizedAccount[]> {
    // A statement is a historical extract; it reports no live balance.
    return [];
  },
  async fetchTransactions(ctx: AdapterContext): Promise<NormalizedTransaction[]> {
    const rows = parseCsv(ctx.config["csv"] ?? "");
    const defaultCurrency = (ctx.config["currency"] || "USD").toUpperCase();
    const out: NormalizedTransaction[] = [];

    rows.forEach((row, index) => {
      const dateRaw = pick(row, ["date", "trade_date", "occurred_at", "time"]);
      if (!dateRaw) return;
      const parsed = new Date(dateRaw);
      if (Number.isNaN(parsed.getTime())) return;

      const sideRaw = (pick(row, ["side", "action", "type"]) ?? "").toLowerCase();
      const kindRaw = (pick(row, ["kind", "category"]) ?? "").toLowerCase();
      const side =
        sideRaw === "buy" || sideRaw === "b" ? "buy" : sideRaw === "sell" || sideRaw === "s" ? "sell"
          : sideRaw === "deposit" ? "deposit" : sideRaw === "withdrawal" ? "withdrawal" : undefined;
      const kind: TransactionKind = (
        ["trade", "order", "execution", "cash", "fee", "dividend", "settlement", "transfer", "adjustment"] as const
      ).includes(kindRaw as TransactionKind)
        ? (kindRaw as TransactionKind)
        : side === "buy" || side === "sell"
          ? "trade"
          : "cash";

      const quantity = num(pick(row, ["quantity", "qty", "shares"]));
      const price = num(pick(row, ["price", "rate"]));
      const amount = num(pick(row, ["amount", "value", "total"])) ?? (quantity && price ? quantity * price : null);
      const externalId = pick(row, ["id", "ref", "ref_id", "reference", "trade_id"]) ?? `csv-row-${index + 1}`;

      out.push({
        externalId,
        kind,
        ...(side ? { side } : {}),
        ...(pick(row, ["symbol", "ticker", "instrument"]) ? { instrument: pick(row, ["symbol", "ticker", "instrument"])! } : {}),
        ...(quantity !== null ? { quantity } : {}),
        ...(price !== null ? { price } : {}),
        ...(amount !== null ? { amount } : {}),
        fees: num(pick(row, ["fees", "fee", "commission"])) ?? 0,
        currency: (pick(row, ["currency"]) ?? defaultCurrency).toUpperCase(),
        occurredAt: parsed.toISOString(),
        sourceRef: `csv:row:${index + 2}`,
        raw: { ...row, provider: "csv_import" },
      });
    });

    return out;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EVM wallet — read-only, public JSON-RPC. No keys, no signing, no custody.
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_RPC = "https://eth.llamarpc.com";

export const evmWalletAdapter: ProviderAdapter = {
  id: "evm_wallet",
  label: "EVM wallet (read-only)",
  category: "wallet",
  summary: "Read-only address monitoring over public JSON-RPC.",
  capabilities: ["Native balance", "No signing, no custody"],
  requiresCredentials: false,
  credentialFields: [],
  configFields: [],
  async test(ctx: AdapterContext): Promise<AdapterTestResult> {
    const address = (ctx.config["address"] ?? "").trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return { ok: false, message: "A valid 0x-prefixed wallet address is required. Never paste a recovery phrase." };
    }
    const rpc = ctx.config["rpc_url"] || DEFAULT_RPC;
    try {
      const { status, body } = await requestJson(
        rpc,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
        },
        ctx.signal,
      );
      const payload = body as { result?: string; error?: { message?: string } };
      if (status !== 200 || payload?.error) {
        return { ok: false, message: `RPC refused the request: ${payload?.error?.message ?? `HTTP ${status}`}` };
      }
      if (typeof payload.result !== "string") {
        return { ok: false, message: "RPC returned an unexpected payload for eth_getBalance." };
      }
      return {
        ok: true,
        message: "Address is reachable and readable on the configured RPC node.",
        permissions: { read: true, trade: false, withdraw: false, sign: false },
      };
    } catch (error) {
      return { ok: false, message: `Could not reach the RPC endpoint: ${(error as Error).message}` };
    }
  },
  async fetchAccounts(ctx: AdapterContext): Promise<NormalizedAccount[]> {
    const address = (ctx.config["address"] ?? "").trim();
    const rpc = ctx.config["rpc_url"] || DEFAULT_RPC;
    const { body } = await requestJson(
      rpc,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
      },
      ctx.signal,
    );
    const hex = (body as { result?: string })?.result;
    if (typeof hex !== "string") throw new Error("RPC returned no balance for this address");
    const wei = BigInt(hex);
    const whole = Number(wei / 10n ** 12n) / 1e6; // 18 decimals, kept within double precision
    return [
      {
        externalId: address.toLowerCase(),
        accountType: "wallet",
        currency: "ETH",
        balance: whole,
        available: whole,
        asOf: new Date().toISOString(),
        sourceRef: `evm:${address.toLowerCase()}`,
        raw: { address, chain: ctx.config["chain"] ?? "ethereum", balanceWei: wei.toString() },
      },
    ];
  },
  async fetchTransactions(): Promise<NormalizedTransaction[]> {
    // Address-level history requires an indexing provider (Etherscan et al.).
    // Until such a credential is configured we report zero history rather than
    // fabricating activity.
    return [];
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Binance — signed spot REST
// ═══════════════════════════════════════════════════════════════════════════

const BINANCE_BASE = "https://api.binance.com";

function binanceSignedQuery(params: Record<string, string>, secret: string): string {
  const query = new URLSearchParams({ ...params, recvWindow: "5000", timestamp: String(Date.now()) }).toString();
  const signature = createHmac("sha256", secret).update(query).digest("hex");
  return `${query}&signature=${signature}`;
}

export const binanceAdapter: ProviderAdapter = {
  id: "binance",
  label: "Binance",
  category: "exchange",
  summary: "Spot balances and trade history via signed REST.",
  capabilities: ["Account balances", "Trade history", "Permission verification"],
  requiresCredentials: true,
  credentialFields: [],
  configFields: [],
  async test(ctx: AdapterContext): Promise<AdapterTestResult> {
    const apiKey = ctx.credentials["apiKey"];
    const apiSecret = ctx.credentials["apiSecret"];
    if (!apiKey || !apiSecret) return { ok: false, message: "API key and secret are required." };

    try {
      const time = await requestJson(`${BINANCE_BASE}/api/v3/time`, {}, ctx.signal);
      if (time.status !== 200) {
        return { ok: false, message: `Binance is unreachable (HTTP ${time.status}).` };
      }
      const account = await requestJson(
        `${BINANCE_BASE}/api/v3/account?${binanceSignedQuery({}, apiSecret)}`,
        { headers: { "X-MBX-APIKEY": apiKey } },
        ctx.signal,
      );
      if (account.status === 401 || account.status === 403) {
        return { ok: false, message: "Binance rejected the key (invalid, expired, or IP-restricted)." };
      }
      const payload = account.body as {
        code?: number;
        msg?: string;
        canTrade?: boolean;
        canWithdraw?: boolean;
        balances?: unknown[];
      };
      if (account.status !== 200 || payload?.code) {
        return { ok: false, message: `Binance error ${payload?.code ?? account.status}: ${payload?.msg ?? "unknown"}` };
      }
      const warnings: string[] = [];
      if (payload.canWithdraw) {
        warnings.push("This key can withdraw funds. Replace it with a read-only key.");
      }
      return {
        ok: true,
        message: "Signed request accepted by Binance.",
        permissions: { read: true, trade: Boolean(payload.canTrade), withdraw: Boolean(payload.canWithdraw) },
        ...(warnings.length ? { warnings } : {}),
      };
    } catch (error) {
      return { ok: false, message: `Binance request failed: ${(error as Error).message}` };
    }
  },
  async fetchAccounts(ctx: AdapterContext): Promise<NormalizedAccount[]> {
    const apiKey = ctx.credentials["apiKey"]!;
    const apiSecret = ctx.credentials["apiSecret"]!;
    const { status, body } = await requestJson(
      `${BINANCE_BASE}/api/v3/account?${binanceSignedQuery({}, apiSecret)}`,
      { headers: { "X-MBX-APIKEY": apiKey } },
      ctx.signal,
    );
    if (status !== 200) throw new Error(`Binance account request failed (HTTP ${status})`);
    const balances = ((body as { balances?: Array<{ asset: string; free: string; locked: string }> }).balances) ?? [];
    const asOf = new Date().toISOString();
    return balances
      .map((b) => {
        const free = num(b.free) ?? 0;
        const locked = num(b.locked) ?? 0;
        return { b, total: free + locked, free };
      })
      .filter((x) => x.total > 0)
      .map(({ b, total, free }) => ({
        externalId: `spot:${b.asset}`,
        accountType: "trading" as const,
        currency: b.asset,
        balance: total,
        available: free,
        asOf,
        sourceRef: `binance:spot:${b.asset}`,
        raw: { asset: b.asset, free: b.free, locked: b.locked },
      }));
  },
  async fetchTransactions(ctx: AdapterContext): Promise<NormalizedTransaction[]> {
    const apiKey = ctx.credentials["apiKey"]!;
    const apiSecret = ctx.credentials["apiSecret"]!;
    const symbols = (ctx.config["symbols"] ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!symbols.length) return [];

    const out: NormalizedTransaction[] = [];
    for (const symbol of symbols) {
      const query = binanceSignedQuery({ symbol, limit: "200" }, apiSecret);
      const { status, body } = await requestJson(
        `${BINANCE_BASE}/api/v3/myTrades?${query}`,
        { headers: { "X-MBX-APIKEY": apiKey } },
        ctx.signal,
      );
      if (status !== 200) throw new Error(`Binance trades request failed for ${symbol} (HTTP ${status})`);
      const trades = (body as Array<{ id: number; orderId: number; price: string; qty: string; commission: string; commissionAsset: string; time: number; isBuyer: boolean }>) ?? [];
      for (const t of trades) {
        const base = symbol.replace(/(USDT|BUSD|USDC|BTC|ETH|BNB|TRY|EUR)$/, "") || symbol;
        const quote = symbol.slice(base.length) || "USDT";
        out.push({
          externalId: `binance:trade:${t.id}`,
          accountExternalId: `spot:${base}`,
          kind: "trade",
          side: t.isBuyer ? "buy" : "sell",
          instrument: `${base}/${quote}`,
          quantity: num(t.qty) ?? 0,
          price: num(t.price) ?? 0,
          amount: (num(t.qty) ?? 0) * (num(t.price) ?? 0),
          fees: num(t.commission) ?? 0,
          currency: quote,
          occurredAt: new Date(t.time).toISOString(),
          sourceRef: `binance:order:${t.orderId}`,
          raw: { ...t, symbol },
        });
      }
    }
    return out;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Alpaca — brokerage trading API (paper or live)
// ═══════════════════════════════════════════════════════════════════════════

export const alpacaAdapter: ProviderAdapter = {
  id: "alpaca",
  label: "Alpaca",
  category: "brokerage",
  summary: "Brokerage account, cash and activity via the official Alpaca API.",
  capabilities: ["Account equity and buying power", "Account activities", "Connectivity verification"],
  requiresCredentials: true,
  credentialFields: [],
  configFields: [],
  async test(ctx: AdapterContext): Promise<AdapterTestResult> {
    const keyId = ctx.credentials["keyId"];
    const secretKey = ctx.credentials["secretKey"];
    if (!keyId || !secretKey) return { ok: false, message: "API key ID and secret are required." };

    const base = ctx.config["environment"] === "live" ? "https://api.alpaca.markets" : "https://paper-api.alpaca.markets";
    try {
      const { status, body } = await requestJson(
        `${base}/v2/account`,
        { headers: { "APCA-API-KEY-ID": keyId, "APCA-API-SECRET-KEY": secretKey } },
        ctx.signal,
      );
      if (status === 401 || status === 403) {
        return { ok: false, message: "Alpaca rejected the credentials for this environment." };
      }
      if (status !== 200) {
        return { ok: false, message: `Alpaca returned HTTP ${status}.` };
      }
      const account = body as { status?: string; account_number?: string };
      return {
        ok: true,
        message: `Connected to Alpaca account ${account.account_number ?? ""} (${account.status ?? "active"}).`.trim(),
        permissions: { read: true, trade: true, withdraw: false },
      };
    } catch (error) {
      return { ok: false, message: `Alpaca request failed: ${(error as Error).message}` };
    }
  },
  async fetchAccounts(ctx: AdapterContext): Promise<NormalizedAccount[]> {
    const base = ctx.config["environment"] === "live" ? "https://api.alpaca.markets" : "https://paper-api.alpaca.markets";
    const { status, body } = await requestJson(
      `${base}/v2/account`,
      {
        headers: {
          "APCA-API-KEY-ID": ctx.credentials["keyId"]!,
          "APCA-API-SECRET-KEY": ctx.credentials["secretKey"]!,
        },
      },
      ctx.signal,
    );
    if (status !== 200) throw new Error(`Alpaca account request failed (HTTP ${status})`);
    const a = body as { account_number?: string; cash?: string; equity?: string; buying_power?: string; currency?: string };
    const asOf = new Date().toISOString();
    return [
      {
        externalId: a.account_number ?? "alpaca-account",
        accountType: "trading",
        currency: (a.currency ?? "USD").toUpperCase(),
        balance: num(a.equity),
        available: num(a.buying_power) ?? num(a.cash),
        asOf,
        sourceRef: `alpaca:${a.account_number ?? "account"}`,
        raw: { cash: a.cash, equity: a.equity, buying_power: a.buying_power },
      },
    ];
  },
  async fetchTransactions(ctx: AdapterContext, since?: string): Promise<NormalizedTransaction[]> {
    const base = ctx.config["environment"] === "live" ? "https://api.alpaca.markets" : "https://paper-api.alpaca.markets";
    const params = new URLSearchParams({ page_size: "100" });
    if (since) params.set("after", since);
    const { status, body } = await requestJson(
      `${base}/v2/account/activities?${params.toString()}`,
      {
        headers: {
          "APCA-API-KEY-ID": ctx.credentials["keyId"]!,
          "APCA-API-SECRET-KEY": ctx.credentials["secretKey"]!,
        },
      },
      ctx.signal,
    );
    if (status !== 200) throw new Error(`Alpaca activities request failed (HTTP ${status})`);
    const activities = (body as Array<Record<string, unknown>>) ?? [];
    return activities.map((activity) => {
      const type = String(activity["activity_type"] ?? activity["type"] ?? "FILL").toLowerCase();
      const side = String(activity["side"] ?? "").toLowerCase();
      const kind: TransactionKind = type.includes("fill") || type.includes("trade") ? "trade"
        : type.includes("div") ? "dividend"
        : type.includes("fee") ? "fee"
        : type.includes("transfer") ? "transfer"
        : "cash";
      return {
        externalId: `alpaca:${String(activity["id"] ?? activity["transaction_time"] ?? Math.random())}`,
        kind,
        ...(side === "buy" || side === "sell" ? { side: side as "buy" | "sell" } : {}),
        ...(activity["symbol"] ? { instrument: String(activity["symbol"]) } : {}),
        ...(num(activity["qty"]) !== null ? { quantity: num(activity["qty"])! } : {}),
        ...(num(activity["price"]) !== null ? { price: num(activity["price"])! } : {}),
        ...(num(activity["net_amount"]) !== null ? { amount: num(activity["net_amount"])! } : {}),
        currency: "USD",
        occurredAt: new Date(String(activity["transaction_time"] ?? activity["date"] ?? Date.now())).toISOString(),
        sourceRef: `alpaca:${type}`,
        raw: activity,
      };
    });
  },
};

export const ADAPTERS: Record<string, ProviderAdapter> = {
  csv_import: csvImportAdapter,
  evm_wallet: evmWalletAdapter,
  binance: binanceAdapter,
  alpaca: alpacaAdapter,
};
