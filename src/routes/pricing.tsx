import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Minus, Sparkles } from "lucide-react";
import { Btn, Panel } from "@/components/kit";
import { PeriodToggle, PlanCards, useCheckout } from "@/components/site/PlanCards";
import { PageShell } from "@/components/site/PageShell";
import { useAuth } from "@/lib/auth-context";
import { type PlanId, PLANS, TRIAL_DAYS, kelviqCheckoutUrl } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Wab Pricing — Basic, Standard and Pro" },
      {
        name: "description",
        content:
          "Compare Wab plans: Basic at $0, Standard at $9/month or $45/year with a 7-day free trial, Pro at $25/month or $90/year.",
      },
      { property: "og:title", content: "Wab Pricing" },
      {
        property: "og:description",
        content:
          "Basic is free. Standard and Pro add higher AI quality, more tools, and a 7-day trial on Standard only.",
      },
    ],
  }),
  component: Pricing,
});

const rows: [string, string | boolean, string | boolean, string | boolean][] = [
  ["Parsed transactions / month", "30", "500", "Unlimited"],
  ["AI quality", "Limited", "Standard", "Highest"],
  ["AI variety / tools", "Core only", "Standard set", "Full set"],
  ["Real-time market data", true, true, true],
  ["Unrealized P&L tracking", true, true, true],
  ["Tax profiles", "1", "2", "Unlimited"],
  ["CSV export", true, true, true],
  ["PDF tax reports", false, true, true],
  ["Anomaly detection", false, true, true],
  ["Tax-loss harvesting", false, false, true],
  ["Background task execution", false, false, true],
  ["Advanced integrations", false, false, true],
  ["7-day free trial", false, true, false],
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true)
    return <BadgeCheck size={18} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />;
  if (v === false) return <Minus size={18} strokeWidth={1.75} style={{ color: "var(--ink-3)" }} />;
  return <span className="tnum text-sm">{v}</span>;
}

function Pricing() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const { period, setPeriod } = useCheckout();

  function handlePlanClick(plan: PlanId) {
    if (!session) {
      navigate({ to: "/signup", search: { plan } });
      return;
    }
    window.location.href = kelviqCheckoutUrl({ plan, period, orgId: profile?.org_id ?? null });
  }

  function handleTrial() {
    if (!session) {
      navigate({ to: "/signup", search: { plan: "trial" } });
      return;
    }
    navigate({ to: "/app/billing" });
  }

  return (
    <PageShell
      eyebrow="Pricing"
      title="Simple, transparent pricing"
      sub="Basic is completely free with limited features and AI quality. Standard is $9/month or $45/year. Pro is $25/month or $90/year. A 7-day free trial is only available for Standard, from the trial card."
    >
      <div
        className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4"
        style={{ background: "var(--accent-6)", border: "1px solid var(--accent-15)" }}
      >
        <div className="flex items-start gap-3">
          <Sparkles
            size={16}
            strokeWidth={1.75}
            style={{ color: "var(--color-accent)", marginTop: 2 }}
          />
          <div>
            <p className="text-sm font-semibold">{TRIAL_DAYS}-day free trial of Standard</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
              This is the only way to start a free trial. After {TRIAL_DAYS} days, upgrade or continue
              on Basic $0.
            </p>
          </div>
        </div>
        <Btn variant="primary" onClick={handleTrial}>
          Start {TRIAL_DAYS}-day free trial
        </Btn>
      </div>

      <div className="mt-10 flex justify-center">
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>
      <div className="mt-8">
        <PlanCards
          period={period}
          onSelect={handlePlanClick}
          ctaFor={(id) =>
            id === "free" ? "Use Basic for $0" : `Choose ${PLANS[id].name}`
          }
        />
      </div>

      <div className="mt-16 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
              {["Feature", "Basic", "Standard", "Pro"].map((h) => (
                <th key={h} className="py-3 text-sm font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} style={{ borderBottom: "1px solid var(--hairline)" }}>
                <td
                  className="sticky left-0 bg-surface py-3 pr-4 text-sm"
                  style={{ color: "var(--ink-2)" }}
                >
                  {r[0]}
                </td>
                <td className="py-3">
                  <Cell v={r[1]} />
                </td>
                <td className="py-3">
                  <Cell v={r[2]} />
                </td>
                <td className="py-3">
                  <Cell v={r[3]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Panel className="mt-14">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold">Trial, then you choose</h3>
            <p className="mt-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
              The Standard trial lasts {TRIAL_DAYS} calendar days from the moment you start it — signing
              out does not pause the clock. When it ends, upgrade or switch back to Basic at $0.
            </p>
          </div>
        </div>
      </Panel>
    </PageShell>
  );
}
