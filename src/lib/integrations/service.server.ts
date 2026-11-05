// ─── Integration service (server only) ───────────────────────────────────────
// Owns the connection lifecycle: configure → verify → sync → disconnect.
// Rules enforced here (not in the UI):
//   • a connection is only "connected" after a genuine adapter test passed
//   • credentials are encrypted before they touch the database
//   • sync is idempotent per request_id and per normalized record
//   • every state change writes an audit row

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { transactionDedupeKey } from "./adapters.server";
import { getAdapter, isKnownProvider } from "./registry.server";
import {
  CredentialKeyMissingError,
  credentialStorageConfigured,
  decryptCredentials,
  encryptCredentials,
} from "./crypto.server";
import type { AdapterTestResult, NormalizedTransaction } from "./types";

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

// Untyped admin client: these tables are newer than the generated Database type.
const db = supabaseAdmin as unknown as SupabaseClient;

const MAX_RECORDS_PER_SYNC = 5_000;

async function audit(entry: {
  orgId: string;
  connectionId: string | null;
  actorId: string | null;
  action: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await db.from("integration_audit").insert({
    org_id: entry.orgId,
    connection_id: entry.connectionId,
    actor_id: entry.actorId,
    action: entry.action,
    detail: entry.detail ?? {},
  });
}

async function loadConnection(orgId: string, connectionId: string) {
  const { data, error } = await db
    .from("provider_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) throw new IntegrationError(error.message, 500);
  if (!data) throw new IntegrationError("Connection not found", 404);
  return data as Record<string, unknown>;
}

async function loadCredentials(
  orgId: string,
  connectionId: string,
): Promise<Record<string, string>> {
  const { data } = await db
    .from("provider_credentials")
    .select("ciphertext,iv,auth_tag,key_version")
    .eq("connection_id", connectionId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data) return {};
  try {
    return decryptCredentials({
      ciphertext: data.ciphertext as string,
      iv: data.iv as string,
      authTag: data.auth_tag as string,
      keyVersion: Number(data.key_version ?? 1),
    });
  } catch {
    // Ciphertext unreadable (rotated key or tampering). Treat as unconfigured
    // rather than guessing — the user must re-enter credentials.
    throw new IntegrationError(
      "Stored credentials could not be decrypted. Re-enter them to reconnect.",
      409,
    );
  }
}

// ── Create ─────────────────────────────────────────────────────────────────────

export interface CreateConnectionInput {
  orgId: string;
  actorId: string;
  provider: string;
  label: string;
  credentials: Record<string, string>;
  config: Record<string, string>;
}

export async function createConnection(input: CreateConnectionInput) {
  if (!isKnownProvider(input.provider)) {
    throw new IntegrationError(`Unknown provider: ${input.provider}`, 400);
  }
  const adapter = getAdapter(input.provider)!;
  const label = input.label.trim();
  if (!label) throw new IntegrationError("A label is required", 400);

  const provided = Object.fromEntries(
    Object.entries(input.credentials).filter(([, v]) => typeof v === "string" && v.trim() !== ""),
  );
  if (adapter.requiresCredentials) {
    const missing = adapter.credentialFields
      .filter((f) => f.required && !provided[f.key])
      .map((f) => f.label);
    if (missing.length) {
      throw new IntegrationError(`Missing required credentials: ${missing.join(", ")}`, 400);
    }
  }

  if (Object.keys(provided).length && !credentialStorageConfigured()) {
    throw new IntegrationError(
      "Credential storage is not configured. Set WAB_CREDENTIAL_KEY in the server environment before connecting a provider that needs secrets.",
      503,
    );
  }

  const { data: connection, error } = await db
    .from("provider_connections")
    .insert({
      org_id: input.orgId,
      provider: input.provider,
      category: adapter.category,
      label,
      status: "unconfigured",
      credentials_set: Object.keys(provided).length > 0,
      config: input.config,
      created_by: input.actorId,
    })
    .select("*")
    .single();
  if (error) throw new IntegrationError(error.message, 500);

  const connectionId = connection.id as string;

  if (Object.keys(provided).length) {
    const encrypted = encryptCredentials(provided);
    const { error: credError } = await db.from("provider_credentials").insert({
      connection_id: connectionId,
      org_id: input.orgId,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      key_version: encrypted.keyVersion,
    });
    if (credError) {
      await db.from("provider_connections").delete().eq("id", connectionId);
      throw new IntegrationError(credError.message, 500);
    }
  }

  await audit({ orgId: input.orgId, connectionId, actorId: input.actorId, action: "created" });

  // Verify immediately: status is only "connected" if the provider confirms.
  const test = await testConnection({ orgId: input.orgId, connectionId, actorId: input.actorId });
  return { connectionId, test };
}

// ── Test ───────────────────────────────────────────────────────────────────────

export async function testConnection(input: {
  orgId: string;
  connectionId: string;
  actorId: string | null;
}): Promise<AdapterTestResult> {
  const connection = await loadConnection(input.orgId, input.connectionId);
  const adapter = getAdapter(String(connection["provider"]));
  if (!adapter) throw new IntegrationError("No adapter available for this provider", 400);

  const credentials = await loadCredentials(input.orgId, input.connectionId);
  const config = (connection["config"] ?? {}) as Record<string, string>;

  let result: AdapterTestResult;
  try {
    result = await adapter.test({ credentials, config });
  } catch (error) {
    result = { ok: false, message: (error as Error).message };
  }

  await db
    .from("provider_connections")
    .update({
      status: result.ok ? "connected" : "error",
      permissions: result.permissions ?? {},
      last_error: result.ok ? null : result.message,
      last_error_at: result.ok ? null : new Date().toISOString(),
      consecutive_errors: result.ok ? 0 : Number(connection["consecutive_errors"] ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.connectionId)
    .eq("org_id", input.orgId);

  await audit({
    orgId: input.orgId,
    connectionId: input.connectionId,
    actorId: input.actorId,
    action: result.ok ? "tested" : "failed",
    detail: { ok: result.ok, message: result.message },
  });

  return result;
}

// ── Sync ───────────────────────────────────────────────────────────────────────

export interface SyncInput {
  orgId: string;
  connectionId: string;
  actorId: string | null;
  requestId?: string | undefined;
  trigger?: "manual" | "schedule" | "webhook" | "retry";
}

export interface SyncResult {
  ok: boolean;
  runId: string | null;
  accountsUpserted: number;
  transactionsInserted: number;
  transactionsSkipped: number;
  message: string;
  /** True when this call returned a previously completed run instead of re-syncing. */
  deduplicated?: boolean;
}

export async function syncConnection(input: SyncInput): Promise<SyncResult> {
  const connection = await loadConnection(input.orgId, input.connectionId);
  const adapter = getAdapter(String(connection["provider"]));
  if (!adapter) throw new IntegrationError("No adapter available for this provider", 400);

  if (connection["status"] === "disconnected") {
    throw new IntegrationError("Connection is disconnected. Reconnect before syncing.", 409);
  }

  // Idempotency: a repeated request_id returns the original outcome.
  if (input.requestId) {
    const { data: existing } = await db
      .from("provider_sync_runs")
      .select("*")
      .eq("connection_id", input.connectionId)
      .eq("request_id", input.requestId)
      .maybeSingle();
    if (existing) {
      if (existing.status === "running") {
        throw new IntegrationError("A sync with this request id is already running", 409);
      }
      return {
        ok: existing.status === "succeeded",
        runId: existing.id as string,
        accountsUpserted: Number(existing.accounts_upserted ?? 0),
        transactionsInserted: Number(existing.transactions_upserted ?? 0),
        transactionsSkipped: Number(existing.transactions_skipped ?? 0),
        message: String(existing.error ?? "Existing run returned"),
        deduplicated: true,
      };
    }
  }

  const trigger = input.trigger ?? "manual";
  const { data: run, error: runError } = await db
    .from("provider_sync_runs")
    .insert({
      org_id: input.orgId,
      connection_id: input.connectionId,
      request_id: input.requestId ?? null,
      trigger,
      status: "running",
    })
    .select("id")
    .single();
  if (runError) throw new IntegrationError(runError.message, 500);
  const runId = run.id as string;

  const credentials = await loadCredentials(input.orgId, input.connectionId);
  const config = (connection["config"] ?? {}) as Record<string, string>;
  const since = connection["last_sync_at"] ? String(connection["last_sync_at"]) : undefined;

  try {
    const accounts = await adapter.fetchAccounts({ credentials, config });
    const transactions = (await adapter.fetchTransactions({ credentials, config }, since)).slice(
      0,
      MAX_RECORDS_PER_SYNC,
    );

    for (const account of accounts) {
      await db.from("provider_accounts").upsert(
        {
          org_id: input.orgId,
          connection_id: input.connectionId,
          external_id: account.externalId,
          account_type: account.accountType,
          currency: account.currency,
          balance: account.balance,
          available: account.available,
          as_of: account.asOf,
          source_ref: account.sourceRef ?? null,
          raw: account.raw,
        },
        { onConflict: "connection_id,external_id" },
      );
    }

    const { inserted, skipped } = await upsertTransactions(
      input.orgId,
      input.connectionId,
      String(connection["provider"]),
      transactions,
    );

    const now = new Date().toISOString();
    await db
      .from("provider_sync_runs")
      .update({
        status: "succeeded",
        finished_at: now,
        accounts_upserted: accounts.length,
        transactions_upserted: inserted,
        transactions_skipped: skipped,
        metadata: { provider: connection["provider"], since: since ?? null },
      })
      .eq("id", runId);

    await db
      .from("provider_connections")
      .update({
        status: "connected",
        last_sync_at: now,
        last_sync_status: "succeeded",
        last_error: null,
        last_error_at: null,
        consecutive_errors: 0,
        updated_at: now,
      })
      .eq("id", input.connectionId)
      .eq("org_id", input.orgId);

    await audit({
      orgId: input.orgId,
      connectionId: input.connectionId,
      actorId: input.actorId,
      action: "synced",
      detail: { runId, accounts: accounts.length, inserted, skipped },
    });

    return {
      ok: true,
      runId,
      accountsUpserted: accounts.length,
      transactionsInserted: inserted,
      transactionsSkipped: skipped,
      message: `${accounts.length} account(s), ${inserted} new transaction(s), ${skipped} unchanged.`,
    };
  } catch (error) {
    const message = (error as Error).message;
    const now = new Date().toISOString();
    await db
      .from("provider_sync_runs")
      .update({ status: "failed", finished_at: now, error: message })
      .eq("id", runId);
    await db
      .from("provider_connections")
      .update({
        status: "error",
        last_sync_status: "failed",
        last_error: message,
        last_error_at: now,
        consecutive_errors: Number(connection["consecutive_errors"] ?? 0) + 1,
        updated_at: now,
      })
      .eq("id", input.connectionId)
      .eq("org_id", input.orgId);
    await audit({
      orgId: input.orgId,
      connectionId: input.connectionId,
      actorId: input.actorId,
      action: "failed",
      detail: { runId, message },
    });
    throw new IntegrationError(message, 502);
  }
}

/** Insert-only, deduplicated by provider-stable key. Never overwrites history. */
async function upsertTransactions(
  orgId: string,
  connectionId: string,
  provider: string,
  transactions: NormalizedTransaction[],
): Promise<{ inserted: number; skipped: number }> {
  const byKey = new Map<string, NormalizedTransaction>();
  for (const tx of transactions) {
    byKey.set(transactionDedupeKey(provider, `${connectionId}:${tx.externalId}`), tx);
  }
  const keys = [...byKey.keys()];
  if (!keys.length) return { inserted: 0, skipped: 0 };

  const existing = new Set<string>();
  for (let i = 0; i < keys.length; i += 200) {
    const slice = keys.slice(i, i + 200);
    const { data } = await db
      .from("provider_transactions")
      .select("dedupe_key")
      .eq("connection_id", connectionId)
      .in("dedupe_key", slice);
    for (const row of (data ?? []) as Array<{ dedupe_key: string }>) existing.add(row.dedupe_key);
  }

  const rows = keys
    .filter((key) => !existing.has(key))
    .map((key) => {
      const tx = byKey.get(key)!;
      return {
        org_id: orgId,
        connection_id: connectionId,
        account_external_id: tx.accountExternalId ?? null,
        external_id: tx.externalId,
        dedupe_key: key,
        kind: tx.kind,
        side: tx.side ?? null,
        instrument: tx.instrument ?? null,
        quantity: tx.quantity ?? null,
        price: tx.price ?? null,
        amount: tx.amount ?? null,
        fees: tx.fees ?? 0,
        currency: tx.currency,
        occurred_at: tx.occurredAt,
        settled_at: tx.settledAt ?? null,
        source_ref: tx.sourceRef ?? null,
        raw: tx.raw,
      };
    });

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("provider_transactions").insert(rows.slice(i, i + 500));
    if (error) throw new Error(`Failed to persist transactions: ${error.message}`);
  }

  return { inserted: rows.length, skipped: keys.length - rows.length };
}

// ── Disconnect ─────────────────────────────────────────────────────────────────

export async function disconnectConnection(input: {
  orgId: string;
  connectionId: string;
  actorId: string | null;
}): Promise<void> {
  await loadConnection(input.orgId, input.connectionId);

  // Credentials are destroyed, not merely flagged. Normalized history stays
  // intact so the ledger keeps its provenance.
  await db
    .from("provider_credentials")
    .delete()
    .eq("connection_id", input.connectionId)
    .eq("org_id", input.orgId);

  await db
    .from("provider_connections")
    .update({
      status: "disconnected",
      credentials_set: false,
      permissions: {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.connectionId)
    .eq("org_id", input.orgId);

  await audit({
    orgId: input.orgId,
    connectionId: input.connectionId,
    actorId: input.actorId,
    action: "disconnected",
  });
}

export { CredentialKeyMissingError, credentialStorageConfigured };
