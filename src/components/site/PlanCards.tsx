import { BadgeCheck } from "lucide-react";
import { useState } from "react";
import { Btn, Panel, StatusPill } from "@/components/kit";
import {
  type ChargePeriod,
  type PlanId,
  PLAN_ORDER,
  PLANS,
  kelviqCheckoutUrl,
  periodSuffix,
  priceLabel,
} from "@/lib/plans";

export function PeriodToggle({
  period,
  onChange,
}: {
  period: ChargePeriod;
  onChange: (p: ChargePeriod) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full p-1 text-xs font-semibold"
      style={{ background: "var(--accent-6)", border: "1px solid var(--hairline)" }}
    >
      {(["monthly", "yearly"] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className="rounded-full px-3 py-1.5 capitalize transition-colors"
          style={
            period === p
              ? { background: "var(--color-accent)", color: "var(--accent-fg)" }
              : { color: "var(--ink-2)" }
          }
        >
          {p}
          {p === "yearly" ? " · save" : ""}
        </button>
      ))}
    </div>
  );
}

export function PlanCards({
  period,
  currentPlan,
  onSelect,
  ctaFor,
}: {
  period: ChargePeriod;
  currentPlan?: string | undefined;
  onSelect: (plan: PlanId) => void;
  ctaFor: (plan: PlanId) => string;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_ORDER.map((id) => {
        const t = PLANS[id];
        const current = (currentPlan ?? "").toLowerCase() === id || (id === "free" && currentPlan === "basic");
        return (
          <Panel
            key={id}
            className="h-full"
            style={
              t.popular
                ? { border: "2px solid var(--color-accent)", boxShadow: "var(--shadow-hover)" }
                : {}
            }
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{t.name}</h3>
              {t.popular && <StatusPill tone="info">Most popular</StatusPill>}
              {id === "free" && <StatusPill tone="ok">Free</StatusPill>}
            </div>
            <p className="tnum mt-4 text-3xl font-semibold">
              {priceLabel(t, period)}
              {t.monthlyPrice > 0 && (
                <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>
                  {periodSuffix(t, period)}
                </span>
              )}
            </p>
            {period === "yearly" && t.yearlyPrice > 0 && (
              <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
                ${t.monthlyPrice}/mo billed yearly
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
              {t.note}
            </p>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--ink-2)" }}>
              {t.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <BadgeCheck
                    size={15}
                    strokeWidth={1.75}
                    style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 1 }}
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Btn
              className="mt-6 w-full"
              variant={t.popular ? "primary" : "secondary"}
              disabled={current && id !== "free"}
              onClick={() => onSelect(id)}
            >
              {current && id !== "free" ? "Current plan" : ctaFor(id)}
            </Btn>
          </Panel>
        );
      })}
    </div>
  );
}

export function useCheckout() {
  const [period, setPeriod] = useState<ChargePeriod>("monthly");

  function openCheckout(plan: PlanId, orgId?: string | null | undefined) {
    window.location.href = kelviqCheckoutUrl({ plan, period, orgId });
  }

  return { period, setPeriod, openCheckout };
}
