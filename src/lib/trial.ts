import { TRIAL_DAYS } from "./plans";

const STORAGE_KEY = "wab.trial.clock.v1";

export interface TrialClock {
  orgId: string;
  userId: string;
  startedAt: string;
  endsAt: string;
}

function readClocks(): TrialClock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrialClock[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClocks(clocks: TrialClock[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clocks));
  } catch {
    /* ignore quota / private mode */
  }
}

export function daysLeftFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function getTrialClock(orgId?: string | null, userId?: string | null): TrialClock | null {
  const clocks = readClocks();
  if (orgId) {
    const byOrg = clocks.find((c) => c.orgId === orgId);
    if (byOrg) return byOrg;
  }
  if (userId) {
    const byUser = clocks.find((c) => c.userId === userId);
    if (byUser) return byUser;
  }
  return null;
}

/** Starts a 7-day clock once. Re-login never resets an existing clock. */
export function startTrialClock(orgId: string, userId: string): TrialClock {
  const existing = getTrialClock(orgId, userId);
  if (existing) return existing;
  const startedAt = new Date().toISOString();
  const endsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
  const next: TrialClock = { orgId, userId, startedAt, endsAt };
  const clocks = readClocks().filter((c) => c.orgId !== orgId && c.userId !== userId);
  clocks.push(next);
  writeClocks(clocks);
  return next;
}

export function clearTrialClock(orgId?: string | null, userId?: string | null) {
  writeClocks(
    readClocks().filter((c) => {
      if (orgId && c.orgId === orgId) return false;
      if (userId && c.userId === userId) return false;
      return true;
    }),
  );
}

export function trialDaysRemaining(clock: TrialClock | null, serverEndsAt?: string | null): number {
  const ends = serverEndsAt || clock?.endsAt;
  return daysLeftFromIso(ends) ?? 0;
}

export function isTrialExpired(clock: TrialClock | null, serverEndsAt?: string | null): boolean {
  const ends = serverEndsAt || clock?.endsAt;
  if (!ends) return false;
  return new Date(ends).getTime() <= Date.now();
}
