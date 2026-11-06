// ─── Integrations action endpoint ────────────────────────────────────────────
// One authenticated endpoint for the connection lifecycle. Authorization is
// enforced here on the server: the caller's JWT identifies the user, and the
// org + role come from the profiles row — never from the request body.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseServerConfig } from "@/lib/env.server";

type Action = "create" | "test" | "sync" | "disconnect";

interface Body {
  action?: Action;
  connection_id?: string;
  provider?: string;
  label?: string;
  credentials?: Record<string, string>;
  config?: Record<string, string>;
  request_id?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function authenticate(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;

  // Reads Worker runtime env, process.env and Vite's env in that order, so the
  // endpoint works in dev as well as on the deployed server.
  const config = supabaseServerConfig();
  if (!config) return null;

  const supabase = createClient(config.url, config.key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id,role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.org_id) return null;
  return {
    user,
    orgId: profile.org_id as string,
    role: (profile.role ?? "viewer") as string,
    supabase,
  };
}

export const Route = createFileRoute("/api/integrations/action")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const principal = await authenticate(request);
        if (!principal) return json({ error: "Unauthorized" }, 401);

        if (!principal.orgId) {
          return json({ error: "No organisation is linked to this account." }, 403);
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const action = body.action;
        if (!action || !["create", "test", "sync", "disconnect"].includes(action)) {
          return json({ error: "action must be create | test | sync | disconnect" }, 400);
        }

        try {
          const service = await import("@/lib/integrations/service.server");
          service.bindIntegrationsClient(principal.supabase);

          if (action === "create") {
            if (!body.provider) return json({ error: "provider is required" }, 400);
            const result = await service.createConnection({
              orgId: principal.orgId,
              actorId: principal.user.id,
              provider: body.provider,
              label: body.label ?? "",
              credentials: sanitizeFields(body.credentials),
              config: sanitizeFields(body.config),
            });
            return json(result, 201);
          }

          if (!body.connection_id) return json({ error: "connection_id is required" }, 400);

          if (action === "test") {
            const result = await service.testConnection({
              orgId: principal.orgId,
              connectionId: body.connection_id,
              actorId: principal.user.id,
            });
            return json(result);
          }

          if (action === "sync") {
            const result = await service.syncConnection({
              orgId: principal.orgId,
              connectionId: body.connection_id,
              actorId: principal.user.id,
              requestId: body.request_id,
              trigger: "manual",
            });
            return json(result);
          }

          await service.disconnectConnection({
            orgId: principal.orgId,
            connectionId: body.connection_id,
            actorId: principal.user.id,
          });
          return json({ ok: true });
        } catch (error) {
          const status =
            typeof (error as { status?: number }).status === "number"
              ? (error as { status: number }).status
              : 500;
          return json({ error: (error as Error).message }, status);
        }
      },
    },
  },
});

/** Only string values, capped, so an oversized or nested payload is rejected. */
function sanitizeFields(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "string") continue;
    if (value.length > 200_000) continue;
    out[key] = value;
  }
  return out;
}
