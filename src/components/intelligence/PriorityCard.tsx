// ─── Priority Card Component ──────────────────────────────────────────────────
// Actionable cards for the "Requires Attention" section.

import { Link } from "@tanstack/react-router";
import { AlertTriangle, AlertCircle, Info, CheckCircle, ArrowRight } from "lucide-react";
import type { Priority } from "@/lib/financial-intelligence";

interface Props {
  priority: Priority;
  index?: number;
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    icon: AlertCircle,
    bg: "color-mix(in srgb, var(--bad) 6%, transparent)",
    border: "color-mix(in srgb, var(--bad) 18%, transparent)",
    iconColor: "var(--bad)",
    badge: "color-mix(in srgb, var(--bad) 10%, transparent)",
    badgeText: "var(--bad)",
    dot: "var(--bad)",
  },
  HIGH: {
    icon: AlertTriangle,
    bg: "color-mix(in srgb, var(--warn) 6%, transparent)",
    border: "color-mix(in srgb, var(--warn) 18%, transparent)",
    iconColor: "var(--warn)",
    badge: "color-mix(in srgb, var(--warn) 10%, transparent)",
    badgeText: "var(--warn)",
    dot: "var(--warn)",
  },
  MEDIUM: {
    icon: Info,
    bg: "color-mix(in srgb, var(--info) 6%, transparent)",
    border: "color-mix(in srgb, var(--info) 18%, transparent)",
    iconColor: "var(--info)",
    badge: "color-mix(in srgb, var(--info) 10%, transparent)",
    badgeText: "var(--info)",
    dot: "var(--info)",
  },
  LOW: {
    icon: CheckCircle,
    bg: "color-mix(in srgb, var(--ok) 6%, transparent)",
    border: "color-mix(in srgb, var(--ok) 18%, transparent)",
    iconColor: "var(--ok)",
    badge: "color-mix(in srgb, var(--ok) 10%, transparent)",
    badgeText: "var(--ok)",
    dot: "var(--ok)",
  },
};

export function PriorityCard({ priority }: Props) {
  const config = SEVERITY_CONFIG[priority.severity];
  const Icon = config.icon;

  return (
    <div
      className="group relative overflow-hidden rounded-xl p-4 transition-all hover:shadow-md"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: config.badge }}
        >
          <Icon size={16} style={{ color: config.iconColor }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: config.iconColor }}
            >
              {priority.severity}
            </span>
            {priority.count !== undefined && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: config.badge, color: config.iconColor }}
              >
                {priority.count}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {priority.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {priority.description}
          </p>
          {priority.impact && (
            <p className="mt-1.5 text-xs font-medium" style={{ color: config.iconColor }}>
              {priority.impact}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Link
          to={priority.actionLink}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all group-hover:gap-2"
          style={{ color: config.iconColor, background: config.badge }}
        >
          {priority.action}
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export function PriorityCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4"
      style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="size-8 animate-pulse rounded-lg"
          style={{ background: "var(--hairline)" }}
        />
        <div className="flex-1 space-y-2">
          <div
            className="h-3 w-16 animate-pulse rounded"
            style={{ background: "var(--hairline)" }}
          />
          <div
            className="h-4 w-48 animate-pulse rounded"
            style={{ background: "var(--hairline)" }}
          />
          <div
            className="h-3 w-full animate-pulse rounded"
            style={{ background: "var(--hairline)" }}
          />
        </div>
      </div>
    </div>
  );
}
