// ─── AI provider resolution ─────────────────────────────────────────────────
// Server only. Builds an ordered cascade of every provider that has a usable
// key, then proves the first one that actually answers before the chat route
// streams with it.
//
// Order: Lovable AI gateway (hosted default) → Google Gemini → OpenAI →
// OpenRouter → Groq. The cascade exists because keys expire, projects get
// suspended and free models get retired; without it a single dead key makes
// every prompt fail with a generic error.

import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import { serverEnv, type EnvBag } from "./env.server";

export const AI_MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

/** Required request options for Lovable's /v1/responses models. */
const LOVABLE_PROVIDER_OPTIONS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

/** Empty options for non-Lovable providers (they don't support reasoning_content). */
const DEFAULT_PROVIDER_OPTIONS = {} as const;

export interface ResolvedModel {
  provider: "lovable" | "gemini" | "openai" | "openrouter" | "groq";
  modelId: string;
  model: LanguageModel;
  providerOptions: Record<string, unknown>;
  cascade: Array<{
    id: string;
    model: LanguageModel;
    provider: ResolvedModel["provider"];
    modelId: string;
    providerOptions: Record<string, unknown>;
  }>;
}

/**
 * Gemini 2.0 is fully shut down and 2.5 is being auto-routed away, so a stale
 * GEMINI_MODEL value in a deployment's env must never be sent to the API.
 */
const RETIRED_GEMINI = /^gemini-2\.(0|5)-/i;
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

function geminiModelId(env?: EnvBag): string {
  const configured = serverEnv("GEMINI_MODEL", env);
  if (configured && !RETIRED_GEMINI.test(configured)) return configured;
  return DEFAULT_GEMINI_MODEL;
}

/**
 * Builds the provider cascade. Returns null only when no provider has a key —
 * callers turn that into a configuration error the operator can act on.
 */
export async function resolveAgentModel(env?: EnvBag): Promise<ResolvedModel | null> {
  const cascade: ResolvedModel["cascade"] = [];

  const lovableKey = serverEnv("LOVABLE_API_KEY", env);
  if (lovableKey) {
    const provider = createOpenAI({
      baseURL: GATEWAY,
      apiKey: lovableKey,
      headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const modelId = serverEnv("LOVABLE_AI_MODEL", env) ?? AI_MODEL;
    cascade.push({
      id: modelId,
      model: provider.responses(modelId) as unknown as LanguageModel,
      provider: "lovable",
      modelId,
      providerOptions: LOVABLE_PROVIDER_OPTIONS as unknown as Record<string, unknown>,
    });
  }

  const geminiKey =
    serverEnv("GEMINI_API_KEY", env) ?? serverEnv("GOOGLE_GENERATIVE_AI_API_KEY", env);
  if (geminiKey) {
    const modelId = geminiModelId(env);
    const provider = createGoogleGenerativeAI({ apiKey: geminiKey });
    cascade.push({
      id: modelId,
      model: provider(modelId) as unknown as LanguageModel,
      provider: "gemini",
      modelId,
      providerOptions: DEFAULT_PROVIDER_OPTIONS as unknown as Record<string, unknown>,
    });
  }

  const openAIKey = serverEnv("OPENAI_API_KEY", env);
  if (openAIKey) {
    const modelId = serverEnv("OPENAI_MODEL", env) ?? "gpt-4o-mini";
    const provider = createOpenAI({ apiKey: openAIKey });
    cascade.push({
      id: modelId,
      model: provider.chat(modelId) as unknown as LanguageModel,
      provider: "openai",
      modelId,
      providerOptions: DEFAULT_PROVIDER_OPTIONS as unknown as Record<string, unknown>,
    });
  }

  const openRouterKey = serverEnv("OPENROUTER_API_KEY", env);
  if (openRouterKey) {
    const modelId = serverEnv("OPENROUTER_MODEL", env) ?? "openai/gpt-4o-mini";
    const provider = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      headers: {
        "HTTP-Referer": serverEnv("VITE_APP_URL", env) ?? "https://psxl.live",
        "X-Title": "Wab",
      },
    });
    cascade.push({
      id: modelId,
      model: provider.chatModel(modelId) as unknown as LanguageModel,
      provider: "openrouter",
      modelId,
      providerOptions: DEFAULT_PROVIDER_OPTIONS as unknown as Record<string, unknown>,
    });
  }

  const groqKey = serverEnv("GROQ_API_KEY", env);
  if (groqKey) {
    const modelId = serverEnv("GROQ_MODEL", env) ?? "llama-3.3-70b-versatile";
    const provider = createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
    });
    cascade.push({
      id: modelId,
      model: provider.chatModel(modelId) as unknown as LanguageModel,
      provider: "groq",
      modelId,
      providerOptions: DEFAULT_PROVIDER_OPTIONS as unknown as Record<string, unknown>,
    });
  }

  if (cascade.length === 0) return null;

  const first = cascade[0]!;
  return {
    provider: first.provider,
    modelId: first.modelId,
    model: first.model,
    providerOptions: first.providerOptions,
    cascade,
  };
}

// ── Reachability probing ────────────────────────────────────────────────────

export interface ProviderAttempt {
  provider: string;
  modelId: string;
  ok: boolean;
  status?: number;
  message?: string;
}

interface ProbeResult {
  ok: boolean;
  until: number;
  status?: number;
  message?: string;
}

/** Per-isolate memory so a dead provider is not re-probed on every message. */
const probeCache = new Map<string, ProbeResult>();
const HEALTHY_TTL_MS = 5 * 60_000;
const UNHEALTHY_TTL_MS = 30_000;

function describeProbeError(error: unknown): { status?: number; message: string } {
  const status =
    (error as { statusCode?: number }).statusCode ??
    (error as { status?: number }).status ??
    (error as { cause?: { status?: number } }).cause?.status;

  const raw =
    (error as { responseBody?: string }).responseBody ??
    (error as { cause?: { message?: string } }).cause?.message ??
    (error as Error).message ??
    "Unknown provider error";

  let message = String(raw);
  try {
    const parsed = JSON.parse(message) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const nested = typeof parsed.error === "string" ? parsed.error : parsed.error?.message;
    message = nested ?? parsed.message ?? message;
  } catch {
    // plain text body — keep it
  }
  return status === undefined
    ? { message: message.slice(0, 300) }
    : { status, message: message.slice(0, 300) };
}

async function probe(entry: ResolvedModel["cascade"][number]): Promise<ProbeResult> {
  const cacheKey = `${entry.provider}:${entry.modelId}`;
  const cached = probeCache.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached;

  try {
    await generateText({
      model: entry.model,
      prompt: "Reply with OK.",
      maxOutputTokens: 4,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20_000),
      providerOptions: entry.providerOptions as never,
    });
    const result: ProbeResult = { ok: true, until: Date.now() + HEALTHY_TTL_MS };
    probeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    const described = describeProbeError(error);
    const result: ProbeResult = {
      ok: false,
      until: Date.now() + UNHEALTHY_TTL_MS,
      ...(described.status === undefined ? {} : { status: described.status }),
      message: described.message,
    };
    probeCache.set(cacheKey, result);
    return result;
  }
}

export interface WorkingModel extends ResolvedModel {
  attempts: ProviderAttempt[];
}

/**
 * Returns the first provider in the cascade that really answers. When none do,
 * returns null together with every provider's rejection reason so the UI can
 * show something actionable instead of "something went wrong".
 */
export async function selectWorkingModel(resolved: ResolvedModel | null): Promise<{
  model: WorkingModel | null;
  attempts: ProviderAttempt[];
}> {
  if (!resolved) return { model: null, attempts: [] };

  const attempts: ProviderAttempt[] = [];
  for (const entry of resolved.cascade) {
    const result = await probe(entry);
    attempts.push({
      provider: entry.provider,
      modelId: entry.modelId,
      ok: result.ok,
      ...(result.status === undefined ? {} : { status: result.status }),
      ...(result.message === undefined ? {} : { message: result.message }),
    });
    if (!result.ok) {
      console.warn(
        `[Wab AI] provider ${entry.provider}/${entry.modelId} rejected the request:`,
        result.message,
      );
      continue;
    }
    return {
      model: {
        provider: entry.provider,
        modelId: entry.modelId,
        model: entry.model,
        providerOptions: entry.providerOptions,
        cascade: resolved.cascade,
        attempts,
      },
      attempts,
    };
  }
  return { model: null, attempts };
}

/** One-line operator-facing reason for a failed probe run. */
export function describeAttempts(attempts: ProviderAttempt[]): string {
  if (attempts.length === 0) {
    return "No AI provider key is configured. Add GEMINI_API_KEY (or OPENAI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY) to your environment and redeploy.";
  }
  return attempts
    .map(
      (a) =>
        `${a.provider}/${a.modelId}: ${a.status ? `HTTP ${a.status} — ` : ""}${a.message ?? "failed"}`,
    )
    .join(" • ");
}

/** Friendly message for gateway failures (credits, rate limit, etc). */
export function describeAiError(e: unknown): { status: number; message: string } {
  const status =
    (e as { statusCode?: number })?.statusCode ?? (e as { status?: number })?.status ?? 500;
  if (status === 402)
    return {
      status,
      message: "AI credits are used up. Add credits in your workspace settings to continue.",
    };
  if (status === 429)
    return { status, message: "Wab AI is busy right now. Please try again in a moment." };
  if (status === 403) return { status, message: "AI access is blocked for this workspace." };
  return { status, message: "Wab AI is temporarily unavailable. Your data was not changed." };
}

export function isProviderError(e: unknown): boolean {
  const s =
    (e as { statusCode?: number; status?: number })?.statusCode ??
    (e as { status?: number })?.status;
  return s === 429 || (typeof s === "number" && s >= 500);
}
export const isQuotaError = isProviderError;
