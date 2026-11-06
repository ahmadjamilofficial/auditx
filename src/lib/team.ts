import { supabase } from "@/lib/supabase";

export const INVITE_STORAGE_KEY = "wab_invite_token";

export type TeamRole = "admin" | "analyst" | "viewer";

export function persistInviteToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token && token.trim()) localStorage.setItem(INVITE_STORAGE_KEY, token.trim());
}

export function takeInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("invite");
  if (fromUrl) persistInviteToken(fromUrl);
  return localStorage.getItem(INVITE_STORAGE_KEY);
}

export async function acceptStoredInvite(): Promise<boolean> {
  const token = takeInviteToken();
  if (!token) return false;
  const { error } = await supabase.rpc("accept_org_invite", { _token: token });
  if (error) return false;
  localStorage.removeItem(INVITE_STORAGE_KEY);
  return true;
}

export function inviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/signup?invite=${encodeURIComponent(token)}`;
}

export function randomInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
