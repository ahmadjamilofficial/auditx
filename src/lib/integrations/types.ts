// ─── Integration layer: typed contracts ──────────────────────────────────────
// Every provider adapter speaks these types. The financial engine never sees
// provider-specific shapes — only NormalizedAccount / NormalizedTransaction.

export type ConnectionCategory =
  | "exchange"
  | "brokerage"
  | "wallet"
  | "accounting"
  | "custom"
  | "import";

export type ConnectionStatus =
  | "unconfigured"
  | "connected"
  | "error"
  | "paused"
  | "disconnected";

export interface CredentialField {
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder?: string;
  help?: string;
}

export interface ConfigField {
  key: string;
  label: string;
  required: boolean;
  placeholder?: string;
  help?: string;
}

export interface NormalizedAccount {
  externalId: string;
  accountType: "trading" | "cash" | "wallet" | "margin" | "ledger";
  currency: string;
  balance: number | null;
  available: number | null;
  asOf: string; // ISO
  sourceRef?: string;
  raw: Record<string, unknown>;
}

export type TransactionKind =
  | "trade"
  | "order"
  | "execution"
  | "cash"
  | "fee"
  | "dividend"
  | "settlement"
  | "transfer"
  | "adjustment";

export interface NormalizedTransaction {
  externalId: string;
  accountExternalId?: string;
  kind: TransactionKind;
  side?: "buy" | "sell" | "deposit" | "withdrawal";
  instrument?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  fees?: number;
  currency: string;
  occurredAt: string; // ISO
  settledAt?: string;
  sourceRef?: string;
  raw: Record<string, unknown>;
}

/** Result of a genuine connectivity check against the provider. */
export interface AdapterTestResult {
  ok: boolean;
  /** Human-readable explanation, safe to show in the UI. Never contains secrets. */
  message: string;
  /** Capabilities the provider actually confirmed (not what we wish it had). */
  permissions?: Record<string, boolean>;
  /** Non-fatal notes, e.g. "read-only key detected". */
  warnings?: string[];
}

export interface AdapterContext {
  /** Decrypted, in-memory only. Never logged, never persisted in plaintext. */
  credentials: Record<string, string>;
  config: Record<string, string>;
  /** Abort signal derived from the request/sync deadline. */
  signal?: AbortSignal;
}

export interface ProviderAdapter {
  id: string;
  label: string;
  category: ConnectionCategory;
  /** One-line description shown in the connections workspace. */
  summary: string;
  /** What WAB can do with this provider, in plain language. */
  capabilities: string[];
  /** False when the adapter needs credentials before it can do anything. */
  requiresCredentials: boolean;
  credentialFields: CredentialField[];
  configFields: ConfigField[];
  test(ctx: AdapterContext): Promise<AdapterTestResult>;
  fetchAccounts(ctx: AdapterContext): Promise<NormalizedAccount[]>;
  fetchTransactions(
    ctx: AdapterContext,
    since: string | undefined,
  ): Promise<NormalizedTransaction[]>;
}

export interface ProviderSummary {
  id: string;
  label: string;
  category: ConnectionCategory;
  summary: string;
  capabilities: string[];
  requiresCredentials: boolean;
  credentialFields: CredentialField[];
  configFields: ConfigField[];
}
