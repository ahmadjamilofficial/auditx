import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Minus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Btn, Panel, Reveal, StatusPill } from "@/components/kit";
import { PageShell } from "@/components/site/PageShell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "AuditX Pricing — Standard and Pro Plans" },
      {
        name: "description",
        content:
          "Compare AuditX plans: Standard at $3/month with 7-day free trial, Pro at $5/month with 7-day free trial. Unlimited transactions, real-time market data, and tax-loss harvesting.",
      },
      { property: "og:title", content: "AuditX Pricing" },
      {
        property: "og:description", content: "Standard and Pro plans with 7-day free trials for trade reconciliation and CGT reporting." },
    ],
  }),
  component: Pricing,
});

const rows: [string, string | boolean, string | boolean][] = [
  ["Parsed transactions / month", "Unlimited", "Unlimited"],
  ["Real-time market data", true, true],
  ["Unrealized P&L tracking", true, true],
  ["Tax profiles", "1", "Unlimited"],
  ["CSV export", true, true],
  ["PDF tax reports", false, true],
  ["Anomaly detection", true, true],
  ["Tax-loss harvesting", false, true],
  ["Background task execution", false, true],
  ["Priority reconciliation", false, true],
  ["Audit-trail retention", "90 days", "2 years"],
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
  const KELVIQ_CHECKOUT_URL = import.meta.env['VITE_KELVIQ_CHECKOUT_URL'] || "https://www.kelviq.com/buy/ac42e10b-db2e-44ca-b212-6d4f0429b6e3/?enabled=pro-plan%2Cstandard-plan&plan_identifier=pro-plan&charge_period=MONTHLY";

  function handlePlanClick(planName: string) {
    // If not logged in, redirect to signup first, then to checkout
    if (!session) {
      navigate({ to: "/signup", search: { plan: planName.toLowerCase() } });
      return;
    }

    // Construct checkout URL with org_id in metadata
    const baseUrl = KELVIQ_CHECKOUT_URL.replace("plan_identifier=pro-plan", `plan_identifier=${planName.toLowerCase()}-plan`);
    const checkoutUrl = `${baseUrl}&metadata[org_id]=${profile?.org_id}`;
    window.location.href = checkoutUrl;
  }

  return (
    <PageShell
      eyebrow="Pricing"
      title="Simple, transparent pricing"
      sub="Every plan includes deterministic tax math, hash-chained audit logging, real-time market data, and per-organisation data isolation. 7-day free trial on all plans."
    >
      <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {[
          { name: "Standard", price: "$3", note: "For individual traders", popular: false },
          { name: "Pro", price: "$5", note: "For active traders and professionals", popular: true },
        ].map((t, i) => (
          <Reveal key={t.name} i={i}>
            <Panel
              className="h-full"
              style={
                t.popular ? { border: "2px solid var(--color-accent)", boxShadow: "var(--shadow-hover)" } : {}
              }
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{t.name}</h3>
                {t.popular && <StatusPill tone="info">Most popular</StatusPill>}
              </div>
              <p className="tnum mt-4 text-3xl font-semibold">
                {t.price}
                <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>
                  /mo
                </span>
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
                {t.note}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusPill tone="ok">7-day free trial</StatusPill>
              </div>
              <Btn
                className="mt-6 w-full"
                variant={t.popular ? "primary" : "secondary"}
                onClick={() => handlePlanClick(t.name)}
              >
                Start 7-day free trial
              </Btn>
            </Panel>
          </Reveal>
        ))}
      </div>

      <div className="mt-16 overflow-x-auto max-w-4xl mx-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
              {["Feature", "Standard", "Pro"].map((h) => (
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
                  className="sticky left-0 bg-white py-3 pr-4 text-sm"
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Panel className="mt-14 max-w-4xl mx-auto">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold">Money-back guarantee</h3>
            <p className="mt-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
              Not satisfied? Cancel anytime within the trial period. No questions asked.
            </p>
          </div>
        </div>
      </Panel>
    </PageShell>
  );
}
