// ─── Server environment access ───────────────────────────────────────────────
// One place that knows where configuration can live, because it differs by host:
//
//   1. the `env` object the Worker runtime passes into `fetch(request, env)`
//      (stored on globalThis by src/server.ts)
//   2. Node's process.env (Vercel / long-running node server)
//   3. Vite's import.meta.env (local `vite dev`, which does NOT copy .env into
//      process.env — this is why API routes used to report "not configured")
//
// Only server-only modules may import this file.

export type EnvBag = Record<string, unknown> | undefined;

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("your-") || trimmed === "changeme" || trimmed === "placeholder") return undefined;
  return trimmed;
}

function fromImportMeta(name: string): unknown {
  try {
    // Vite injects import.meta.env for both SSR and client builds.
    const meta = import.meta as unknown as { env?: Record<string, unknown> };
    return meta.env?.[name];
  } catch {
    return undefined;
  }
}

/** Read a server configuration value from every supported source. */
export function serverEnv(name: string, env?: EnvBag): string | undefined {
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  const fromRuntime = (globalThis as { __VERCEL_ENV__?: Record<string, unknown> }).__VERCEL_ENV__?.[name];
  return (
    clean(fromProcess) ??
    clean(env?.[name]) ??
    clean(fromRuntime) ??
    clean(fromImportMeta(name))
  );
}

/** True when at least one of the given names has a usable value. */
export function hasServerEnv(names: string[], env?: EnvBag): boolean {
  return names.some((name) => Boolean(serverEnv(name, env)));
}

/** Supabase URL + publishable key, with the VITE_-prefixed aliases Vite exposes. */
export function supabaseServerConfig(env?: EnvBag): { url: string; key: string } | null {
  const url = serverEnv("SUPABASE_URL", env) ?? serverEnv("VITE_SUPABASE_URL", env);
  const key =
    serverEnv("SUPABASE_PUBLISHABLE_KEY", env) ??
    serverEnv("SUPABASE_ANON_KEY", env) ??
    serverEnv("VITE_SUPABASE_PUBLISHABLE_KEY", env) ??
    serverEnv("VITE_SUPABASE_ANON_KEY", env);
  return url && key ? { url, key } : null;
}
