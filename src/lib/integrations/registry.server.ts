// ─── Provider registry (server only) ─────────────────────────────────────────
// Single source of truth for which adapters the engine can actually drive.
// The UI catalog and this registry share ids; a connection can only be created
// for an id present here.

import { ADAPTERS } from "./adapters.server";
import { PROVIDER_CATALOG } from "./catalog";
import type { ProviderAdapter } from "./types";

export function getAdapter(providerId: string): ProviderAdapter | undefined {
  return ADAPTERS[providerId];
}

export function isKnownProvider(providerId: string): boolean {
  return Object.hasOwn(ADAPTERS, providerId);
}

/** Providers exposed in the catalog but missing an adapter are a build error. */
export function catalogDrift(): string[] {
  const catalogIds = new Set(PROVIDER_CATALOG.map((p) => p.id));
  const adapterIds = new Set(Object.keys(ADAPTERS));
  const missingAdapter = [...catalogIds].filter((id) => !adapterIds.has(id));
  const missingCatalog = [...adapterIds].filter((id) => !catalogIds.has(id));
  return [
    ...missingAdapter.map((id) => `${id}: missing adapter`),
    ...missingCatalog.map((id) => `${id}: missing catalog entry`),
  ];
}

export const PROVIDER_IDS = Object.keys(ADAPTERS);
