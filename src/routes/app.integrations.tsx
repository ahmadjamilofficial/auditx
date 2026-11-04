// ─── Integrations & Connections workspace ────────────────────────────────────
// Everything on this page reflects real backend state. A provider is only
// shown as Connected after the server adapter verified it; failures show the
// provider's actual message. No connection is simulated.

import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { Panel, StatusPill } from "@/components/kit";
import { CATEGORY_LABELS, PROVIDER_CATALOG } from "@/lib/integrations/catalog";
import type { ConnectionStatus } from "@/lib/integrations/types";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/integrations")({
  component: IntegrationsPage,
});

const db = supabase as unknown as SupabaseClient;

interface ConnectionRow {
  id: string;
  provider: string;
  category: string;
  label: string;
  status: ConnectionStatus;
  credentials_set: boolean;
  permissions: Record<string, boolean> | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  last_error_at: string | null;
}

const STATUS_TONE: Record<ConnectionStatus, "ok" | "warn" | "bad" | "info"> = {
  connected: "ok",
  unconfigured: "info",
  paused: "warn",
  error: "bad",
  disconnected: "info",
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: "Connected",
  unconfigured: "Not connected",
  paused: "Paused",
  error: "Error",
  disconnected: "Disconnected",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

async function callAction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session expired. Sign in again.");

  const res = await fetch("/api/integrations/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(payload["error"] ?? `Request failed (${res.status})`));
  return payload;
}

function IntegrationsPage() {
  const { profile } = useAuth();
  const canManage = ["owner", "admin"].includes(String(profile?.role ?? ""));

  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openProvider, setOpenProvider] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await db
      .from("provider_connections")
      .select(
        "id,provider,category,label,status,credentials_set,permissions,last_sync_at,last_sync_status,last_error,last_error_at",
      )
      .order("created_at", { ascending: false });
    if (error) setLoadError(error.message);
    else setConnections((data ?? []) as ConnectionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitCreate(providerId: string) {
    setBusyId(providerId);
    setNotice(null);
    try {
      const provider = PROVIDER_CATALOG.find((p) => p.id === providerId);
      if (!provider) throw new Error("Unknown provider");

      const credentials: Record<string, string> = {};
      const config: Record<string, string> = {};
      for (const field of provider.credentialFields) {
        if (form[field.key]) credentials[field.key] = form[field.key]!;
      }
      for (const field of provider.configFields) {
        if (form[field.key]) config[field.key] = form[field.key]!;
      }

      const result = await callAction({
        action: "create",
        provider: providerId,
        label: form["__label"] || provider.label,
        credentials,
        config,
      });

      const test = result["test"] as { ok?: boolean; message?: string } | undefined;
      setNotice({
        tone: test?.ok ? "ok" : "bad",
        text: test?.message ?? (test?.ok ? "Connection verified." : "Connection could not be verified."),
      });
      setOpenProvider(null);
      setForm({});
      await load();
    } catch (error) {
      setNotice({ tone: "bad", text: (error as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(action: "test" | "sync" | "disconnect", connection: ConnectionRow) {
    setBusyId(connection.id);
    setNotice(null);
    try {
      const result = await callAction({
        action,
        connection_id: connection.id,
        ...(action === "sync" ? { request_id: crypto.randomUUID() } : {}),
      });
      if (action === "sync") {
        setNotice({ tone: "ok", text: String(result["message"] ?? "Sync completed.") });
      } else if (action === "test") {
        setNotice({
          tone: result["ok"] ? "ok" : "bad",
          text: String(result["message"] ?? ""),
        });
      } else {
        setNotice({ tone: "ok", text: "Connection disconnected and credentials destroyed." });
      }
      await load();
    } catch (error) {
      setNotice({ tone: "bad", text: (error as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <Plug size={16} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
          <p
            className="text-[10px] font-semibold uppercase"
            style={{ color: "var(--ink-3)", letterSpacing: "0.14em" }}
          >
            Connected ecosystem
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold">Integrations</h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--ink-2)" }}>
          Connect a provider once and WAB synchronizes it continuously. Credentials are encrypted
          server-side and never returned to this browser. A provider is only marked Connected after
          it confirms the connection itself.
        </p>
      </header>

      {notice && (
        <div
          className="mb-6 flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
          style={{
            background: notice.tone === "ok" ? "var(--accent-4)" : "color-mix(in srgb, var(--bad) 8%, transparent)",
            border: `1px solid ${notice.tone === "ok" ? "var(--hairline)" : "color-mix(in srgb, var(--bad) 25%, transparent)"}`,
            color: notice.tone === "ok" ? "var(--ink-2)" : "var(--bad)",
          }}
        >
          {notice.tone === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* ── Connections ─────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your connections</h2>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "var(--ink-2)" }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <Panel className="flex items-center gap-2 text-sm" >
            <Loader2 size={14} className="animate-spin" />
            <span style={{ color: "var(--ink-2)" }}>Loading connections…</span>
          </Panel>
        ) : loadError ? (
          <Panel className="text-sm" style={{ color: "var(--bad)" }}>
            Could not load connections: {loadError}
          </Panel>
        ) : connections.length === 0 ? (
          <Panel>
            <p className="text-sm font-semibold">No connections yet</p>
            <p className="mt-1 max-w-xl text-sm" style={{ color: "var(--ink-2)" }}>
              Start with a statement import to normalize historical records, or connect an exchange,
              brokerage, or read-only wallet below. Each connection is verified before it is trusted.
            </p>
          </Panel>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => {
              const provider = PROVIDER_CATALOG.find((p) => p.id === c.provider);
              const busy = busyId === c.id;
              return (
                <Panel key={c.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{c.label}</p>
                        <StatusPill tone={STATUS_TONE[c.status] ?? "info"}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </StatusPill>
                        {!c.credentials_set && provider?.requiresCredentials && (
                          <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                            no credentials stored
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
                        {provider?.label ?? c.provider} · {CATEGORY_LABELS[c.category] ?? c.category} ·
                        last sync {formatWhen(c.last_sync_at)}
                      </p>
                      {c.last_error && (
                        <p
                          className="mt-2 rounded-lg px-2 py-1.5 text-xs"
                          style={{
                            color: "var(--bad)",
                            background: "color-mix(in srgb, var(--bad) 7%, transparent)",
                          }}
                        >
                          {c.last_error}
                          {c.last_error_at ? ` · ${formatWhen(c.last_error_at)}` : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ActionButton
                        onClick={() => void runAction("test", c)}
                        busy={busy}
                        disabled={!canManage}
                        icon={<ShieldCheck size={13} />}
                        label="Test"
                      />
                      <ActionButton
                        onClick={() => void runAction("sync", c)}
                        busy={busy}
                        disabled={!canManage || c.status === "disconnected"}
                        icon={<RefreshCw size={13} />}
                        label="Sync now"
                        primary
                      />
                      <ActionButton
                        onClick={() => void runAction("disconnect", c)}
                        busy={busy}
                        disabled={!canManage || c.status === "disconnected"}
                        icon={<Unplug size={13} />}
                        label="Disconnect"
                      />
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
        {!canManage && (
          <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
            Only owners and administrators can modify connections.
          </p>
        )}
      </section>

      {/* ── Catalog ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Available providers</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PROVIDER_CATALOG.map((provider) => {
            const open = openProvider === provider.id;
            return (
              <Panel key={provider.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{provider.label}</p>
                    <p className="mt-0.5 text-[11px] uppercase" style={{ color: "var(--ink-3)" }}>
                      {CATEGORY_LABELS[provider.category] ?? provider.category}
                    </p>
                  </div>
                  {provider.requiresCredentials ? (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ink-3)" }}>
                      <KeyRound size={11} /> key required
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ink-3)" }}>
                      <ShieldCheck size={11} /> read-only
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  {provider.summary}
                </p>

                <ul className="mt-2 space-y-1">
                  {provider.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--ink-2)" }}>
                      <span style={{ color: "var(--color-accent)" }}>·</span>
                      {cap}
                    </li>
                  ))}
                </ul>

                {!open ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenProvider(provider.id);
                      setForm({});
                      setNotice(null);
                    }}
                    disabled={!canManage}
                    className="mt-3 rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-40"
                    style={{ background: "var(--color-accent)", color: "var(--accent-fg)" }}
                  >
                    Connect
                  </button>
                ) : (
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submitCreate(provider.id);
                    }}
                  >
                    <Field
                      label="Label"
                      value={form["__label"] ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, __label: v }))}
                      placeholder={provider.label}
                    />
                    {provider.configFields.map((field) => (
                      <Field
                        key={field.key}
                        label={`${field.label}${field.required ? " *" : ""}`}
                        value={form[field.key] ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                        placeholder={field.placeholder ?? ""}
                        help={field.help}
                        {...(field.key === "csv" ? { multiline: true } : {})}
                      />
                    ))}
                    {provider.credentialFields.map((field) => (
                      <Field
                        key={field.key}
                        label={`${field.label}${field.required ? " *" : ""}`}
                        value={form[field.key] ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                        placeholder={field.placeholder ?? ""}
                        help={field.help}
                        secret
                      />
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={busyId === provider.id}
                        className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                        style={{ background: "var(--color-accent)", color: "var(--accent-fg)" }}
                      >
                        {busyId === provider.id ? <Loader2 size={12} className="animate-spin" /> : null}
                        Save & verify
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenProvider(null);
                          setForm({});
                        }}
                        className="rounded-full px-3 py-1.5 text-xs font-medium"
                        style={{ color: "var(--ink-2)" }}
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                      Secrets are encrypted before storage and never sent back to the browser.
                    </p>
                  </form>
                )}
              </Panel>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ActionButton({
  onClick,
  busy,
  disabled,
  icon,
  label,
  primary,
}: {
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-40"
      style={
        primary
          ? { background: "var(--color-accent)", color: "var(--accent-fg)" }
          : { border: "1px solid var(--hairline)", color: "var(--ink-2)" }
      }
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
  secret,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  help?: string | undefined;
  secret?: boolean | undefined;
  multiline?: boolean | undefined;
}) {
  const shared = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder,
    className: "w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-xs outline-none",
    style: { borderColor: "var(--hairline)", color: "var(--color-text)" },
  };
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium" style={{ color: "var(--ink-2)" }}>
        {label}
      </span>
      {multiline ? <textarea {...shared} rows={4} /> : <input {...shared} type={secret ? "password" : "text"} autoComplete="off" />}
      {help && (
        <span className="mt-1 block text-[10px]" style={{ color: "var(--ink-3)" }}>
          {help}
        </span>
      )}
    </label>
  );
}
