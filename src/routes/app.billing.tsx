import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, CreditCard, Download, Zap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Btn, Panel, StatusPill, reveal } from "@/components/kit";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/billing")({
  component: Billing,
});

const plans = [
  {
    name: "Standard",
    price: "$3",
    monthlyPrice: 3,
    note: "For individuals who need intelligent financial assistance",
    popular: false,
    trialDays: 7,
    kelviqPlan: "standard-plan",
    items: [
      "Natural AI conversations",
      "Agentic financial assistance",
      "Persistent memory",
      "Transaction analysis",
      "Document analysis",
      "Core audit tools",
      "Light and dark themes",
      "Standard integrations",
    ],
  },
  {
    name: "Pro",
    price: "$5",
    monthlyPrice: 5,
    note: "For advanced users and businesses requiring more powerful automation",
    popular: true,
    trialDays: 7,
    kelviqPlan: "pro-plan",
    items: [
      "Everything in Standard",
      "Advanced agent workflows",
      "More integrations",
      "Advanced reconciliation",
      "Automated reporting",
      "Background agent tasks",
      "Advanced spreadsheet operations",
      "Priority processing",
    ],
  },
];

const invoices: Array<{ id: string; date: string; amount: string; status: string }> = [];

function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const kelviqCheckoutUrl = import.meta.env['VITE_KELVIQ_CHECKOUT_URL'] || "https://www.kelviq.com/buy/ac42e10b-db2e-44ca-b212-6d4f0429b6e3/?enabled=pro-plan%2Cstandard-plan&plan_identifier=pro-plan&charge_period=MONTHLY";

  function handleManagePayment() {
    toast.info("Payment management would open Kelviq Customer Portal in production");
  }

  function handleStartTrial(plan: typeof plans[0]) {
    const checkoutUrl = kelviqCheckoutUrl.replace("plan_identifier=pro-plan", `plan_identifier=${plan.kelviqPlan}`);
    window.open(checkoutUrl, "_blank");
    toast.info(`Opening checkout for ${plan.name} plan...`);
  }

  function handleDownloadInvoice(invoiceId: string) {
    toast.info(`Downloading invoice ${invoiceId}...`);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem" }}>Billing</h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
          Manage your plan, usage and payment details.
        </p>
      </div>

      <Panel>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>CURRENT PLAN</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xl font-semibold capitalize">{(user as any)?.plan ?? "Standard"}</p>
              <StatusPill tone="ok">
                {(user as any)?.plan === "standard" ? "Active" : "Pro"}
              </StatusPill>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              {(user as any)?.plan === "standard" ? "$3/month · Includes 7-day free trial" : "$5/month · Includes 7-day free trial"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={handleManagePayment}>
              <CreditCard size={15} strokeWidth={1.75} />
              Manage payment
            </Btn>
          </div>
        </div>
      </Panel>

      <div>
        <p className="mb-4 text-sm font-semibold">Available Plans</p>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={reveal}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Panel
                style={
                  plan.popular
                    ? { border: "2px solid var(--color-accent)", boxShadow: "var(--shadow-hover)" }
                    : {}
                }
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{plan.name}</p>
                  {plan.popular && <StatusPill tone="info">Most popular</StatusPill>}
                </div>
                <p className="tnum mt-3 text-2xl font-semibold">
                  {plan.price}
                  {plan.name !== "Free" && (
                    <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>
                      /mo
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>{plan.note}</p>
                <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <BadgeCheck size={15} strokeWidth={1.75} style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 1 }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Btn
                  variant={
                    ((user as any)?.plan ?? "standard") === plan.name.toLowerCase()
                      ? "secondary"
                      : plan.popular
                        ? "primary"
                        : "secondary"
                  }
                  className="mt-5 w-full"
                  disabled={((user as any)?.plan ?? "standard") === plan.name.toLowerCase()}
                  onClick={() => {
                    if (((user as any)?.plan ?? "standard") !== plan.name.toLowerCase()) {
                      handleStartTrial(plan);
                    }
                  }}
                >
                  {((user as any)?.plan ?? "standard") === plan.name.toLowerCase()
                    ? "Current plan"
                    : plan.trialDays
                      ? `Start ${plan.trialDays}-day free trial`
                      : `Upgrade to ${plan.name}`}
                </Btn>
              </Panel>
            </motion.div>
          ))}
        </div>
      </div>

      {invoices.length > 0 && (
        <Panel>
          <p className="mb-4 text-sm font-semibold">Invoice History</p>
          <div
            className="overflow-hidden rounded-xl"
            style={{ border: "1px solid var(--hairline)" }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: "var(--color-login-bg)", borderBottom: "1px solid var(--hairline)" }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid var(--hairline)" }} className="hover:bg-black/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm">{inv.id}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--ink-2)" }}>{inv.date}</td>
                    <td className="tnum px-4 py-3 text-right text-sm font-medium">{inv.amount}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone="ok">{inv.status}</StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: "var(--color-accent)" }}
                        onClick={() => handleDownloadInvoice(inv.id)}
                      >
                        <Download size={13} strokeWidth={1.75} />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <div
        className="flex items-start gap-2.5 rounded-2xl px-5 py-4 text-sm"
        style={{ background: "rgba(115,66,226,0.06)", border: "1px solid rgba(115,66,226,0.15)" }}
      >
        <ArrowUpRight size={15} strokeWidth={1.75} style={{ color: "var(--color-accent)", marginTop: 2, flexShrink: 0 }} />
        <p style={{ color: "var(--ink-2)" }}>
          <strong>Subscription:</strong> Wab now uses a simple subscription model. Choose Standard ($3/mo) or Pro ($5/mo). Both plans include a 7-day free trial. Your subscription is managed securely through Kelviq.
        </p>
      </div>
    </div>
  );
}
