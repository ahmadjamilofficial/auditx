// ─── Credential encryption (server only) ─────────────────────────────────────
// AES-256-GCM envelope encryption. The key lives ONLY in server env
// (WAB_CREDENTIAL_KEY). Ciphertext is stored in provider_credentials, which has
// RLS enabled and zero policies, so no client can ever read it.
//
// If the key is missing we refuse to store anything: a connection is reported
// as "not configured" rather than pretending credentials are safe.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { serverEnv } from "../env.server";

const DEV_FALLBACK_KEY = "wab.local-dev.credential-key.v1";

/**
 * The key material for credential encryption. Prefers the configured secret;
 * local development falls back to a fixed passphrase so wallet/exchange
 * connections can be tested without provisioning a secret. Never used when a
 * real deployment is running (import.meta.env.DEV is compiled out of prod).
 */
function keyMaterial(): string | undefined {
  const configured = serverEnv("WAB_CREDENTIAL_KEY");
  if (configured) return configured;
  if (import.meta.env.DEV) {
    console.warn(
      "[Wab] WAB_CREDENTIAL_KEY is unset — using the local development key for credential storage.",
    );
    return DEV_FALLBACK_KEY;
  }
  return undefined;
}

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = 1;

export class CredentialKeyMissingError extends Error {
  constructor() {
    super(
      "WAB_CREDENTIAL_KEY is not set. Credential storage is disabled until an " +
        "encryption key is configured in the Vercel environment.",
    );
    this.name = "CredentialKeyMissingError";
  }
}

/** True when server-side credential storage is available. */
export function credentialStorageConfigured(): boolean {
  return Boolean(keyMaterial());
}

function deriveKey(): Buffer {
  const raw = keyMaterial();
  if (!raw) throw new CredentialKeyMissingError();

  // Accept a 32-byte base64/hex secret, or derive deterministically from a
  // passphrase. Salt is fixed per deployment so the derivation is stable.
  const trimmed = raw.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return Buffer.from(trimmed, "hex");
  const maybeBase64 = Buffer.from(trimmed, "base64");
  if (maybeBase64.length === 32) return maybeBase64;
  return scryptSync(trimmed, "wab.credentials.v1", 32);
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export function encryptCredentials(raw: Record<string, string>): EncryptedPayload {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(raw), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

export function decryptCredentials(payload: EncryptedPayload): Record<string, string> {
  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8")) as Record<string, string>;
}

/** Strip anything that looks like a secret before it reaches logs or the UI. */
export function redact<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const SECRET = /(secret|key|token|password|passphrase|api_?key|auth|private)/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = SECRET.test(k) ? "[redacted]" : v;
  }
  return out;
}
