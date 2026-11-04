// ─── Provider catalog (client-safe) ──────────────────────────────────────────
// Pure metadata used by the connections workspace. No secrets, no server code.
// The server registry validates against the same ids, so the UI can never
// offer a provider the engine cannot actually drive.

import type { ProviderSummary } from "./types";

export const PROVIDER_CATALOG: ProviderSummary[] = [
  {
    id: "csv_import",
    label: "Statement import (CSV)",
    category: "import",
    summary:
      "Deterministic CSV import for broker or exchange exports. Used as a fallback import path, not a live feed.",
    capabilities: [
      "Normalize trades, cash movements and fees from a delimited file",
      "Idempotent re-import via a stable per-row dedupe key",
    ],
    requiresCredentials: false,
    credentialFields: [],
    configFields: [
      {
        key: "csv",
        label: "CSV content",
        required: true,
        help: "Header row required. Recognised columns: date, symbol, side, quantity, price, fees, currency, id, kind.",
      },
      {
        key: "currency",
        label: "Default currency",
        required: false,
        placeholder: "PKR",
      },
    ],
  },
  {
    id: "evm_wallet",
    label: "EVM wallet (read-only)",
    category: "wallet",
    summary:
      "Read-only address monitoring over public JSON-RPC. WAB never requests a seed phrase or private key.",
    capabilities: [
      "Native balance and block height for an address",
      "No signing, no custody, no write access",
    ],
    requiresCredentials: false,
    credentialFields: [],
    configFields: [
      {
        key: "address",
        label: "Wallet address",
        required: true,
        placeholder: "0x…",
        help: "Public address only. Never enter a recovery phrase.",
      },
      {
        key: "rpc_url",
        label: "RPC endpoint",
        required: false,
        placeholder: "https://eth.llamarpc.com",
      },
      { key: "chain", label: "Chain label", required: false, placeholder: "ethereum" },
    ],
  },
  {
    id: "binance",
    label: "Binance",
    category: "exchange",
    summary:
      "Spot balances and trade history via signed REST calls. Requires a read-only API key.",
    capabilities: [
      "Account balances",
      "Trade history (per configured symbol)",
      "Connectivity and permission verification",
    ],
    requiresCredentials: true,
    credentialFields: [
      { key: "apiKey", label: "API key", secret: true, required: true },
      {
        key: "apiSecret",
        label: "API secret",
        secret: true,
        required: true,
        help: "Create a read-only key with trading and withdrawal disabled.",
      },
    ],
    configFields: [
      {
        key: "symbols",
        label: "Symbols for trade history",
        required: false,
        placeholder: "BTCUSDT,ETHUSDT",
        help: "Binance requires a symbol to list trades.",
      },
    ],
  },
  {
    id: "alpaca",
    label: "Alpaca",
    category: "brokerage",
    summary:
      "Brokerage account, cash and activity via the official Alpaca trading API (paper or live).",
    capabilities: [
      "Account equity and buying power",
      "Account activities (fills, dividends, fees)",
      "Connectivity verification",
    ],
    requiresCredentials: true,
    credentialFields: [
      { key: "keyId", label: "API key ID", secret: true, required: true },
      { key: "secretKey", label: "API secret", secret: true, required: true },
    ],
    configFields: [
      {
        key: "environment",
        label: "Environment",
        required: false,
        placeholder: "paper",
        help: "paper or live. Defaults to paper.",
      },
    ],
  },
];

export function providerSummary(id: string): ProviderSummary | undefined {
  return PROVIDER_CATALOG.find((p) => p.id === id);
}

export const CATEGORY_LABELS: Record<string, string> = {
  exchange: "Crypto exchange",
  brokerage: "Brokerage",
  wallet: "Wallet",
  accounting: "Accounting",
  custom: "Custom API",
  import: "Statement import",
};
