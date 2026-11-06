// ─── Plan definitions, pricing, checkout, and entitlement checks ─────────────

export type PlanId = "free" | "standard" | "pro";

export type ChargePeriod = "monthly" | "yearly";

export interface PlanLimits {
  id: PlanId;
  name: string;
  note: string;
  kelviqPlan: "free-plan" | "standard-plan" | "pro-plan";
  monthlyPrice: number;
  yearlyPrice: number;
  trialDays: number;
  popular: boolean;
  /** null = unlimited */
  transactionsPerMonth: number | null;
  taxProfiles: number | null;
  brokerAccounts: number | null;
  dailyAiCredits: number;
  maxAgentSteps: number;
  aiQuality: "limited" | "standard" | "high";
  features: {
    csvExport: boolean;
    pdfExport: boolean;
    anomalyDetection: boolean;
    taxLossHarvesting: boolean;
    multiAccount: boolean;
    teamRoles: boolean;
    apiAccess: boolean;
    backgroundTasks: boolean;
    advancedIntegrations: boolean;
    specialistAgents: boolean;
  };
  highlights: string[];
}

export const TRIAL_DAYS = 7;

export const KELVIQ_CHECKOUT_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.["VITE_KELVIQ_CHECKOUT_URL"] as string | undefined)) ||
  "https://www.kelviq.com/buy/ac42e10b-db2e-44ca-b212-6d4f0429b6e3/?enabled=free-plan%2Cpro-plan%2Cstandard-plan&plan_identifier=free-plan&charge_period=ONE_TIME";

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Basic",
    note: "Completely free. Core tools only — limited AI quality and variety.",
    kelviqPlan: "free-plan",
    monthlyPrice: 0,
    yearlyPrice: 0,
    trialDays: 0,
    popular: false,
    transactionsPerMonth: 30,
    taxProfiles: 1,
    brokerAccounts: 1,
    dailyAiCredits: 8,
    maxAgentSteps: 8,
    aiQuality: "limited",
    features: {
      csvExport: true,
      pdfExport: false,
      anomalyDetection: false,
      taxLossHarvesting: false,
      multiAccount: false,
      teamRoles: false,
      apiAccess: false,
      backgroundTasks: false,
      advancedIntegrations: false,
      specialistAgents: false,
    },
    highlights: [
      "Completely free — no card required",
      "30 parsed transactions / month",
      "Limited AI quality and shorter answers",
      "Core ledger and CSV export",
      "1 tax profile · 1 broker account",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    note: "For individuals who need intelligent financial assistance",
    kelviqPlan: "standard-plan",
    monthlyPrice: 9,
    yearlyPrice: 45,
    trialDays: TRIAL_DAYS,
    popular: false,
    transactionsPerMonth: 500,
    taxProfiles: 2,
    brokerAccounts: 3,
    dailyAiCredits: 60,
    maxAgentSteps: 18,
    aiQuality: "standard",
    features: {
      csvExport: true,
      pdfExport: true,
      anomalyDetection: true,
      taxLossHarvesting: false,
      multiAccount: false,
      teamRoles: false,
      apiAccess: false,
      backgroundTasks: false,
      advancedIntegrations: false,
      specialistAgents: false,
    },
    highlights: [
      "500 parsed transactions / month",
      "Standard AI quality",
      "Natural conversations and memory",
      "Document and transaction analysis",
      "PDF tax summary",
      "Anomaly detection",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    note: "For active traders and professionals",
    kelviqPlan: "pro-plan",
    monthlyPrice: 25,
    yearlyPrice: 90,
    trialDays: 0,
    popular: true,
    transactionsPerMonth: null,
    taxProfiles: null,
    brokerAccounts: 10,
    dailyAiCredits: 200,
    maxAgentSteps: 28,
    aiQuality: "high",
    features: {
      csvExport: true,
      pdfExport: true,
      anomalyDetection: true,
      taxLossHarvesting: true,
      multiAccount: true,
      teamRoles: false,
      apiAccess: false,
      backgroundTasks: true,
      advancedIntegrations: true,
      specialistAgents: true,
    },
    highlights: [
      "Unlimited parsed transactions",
      "Highest AI quality and variety",
      "Everything in Standard",
      "Tax-loss harvesting",
      "Background agent tasks",
      "Advanced integrations",
      "Priority processing",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "standard", "pro"];

export type FeatureKey = keyof PlanLimits["features"];

export function normalizePlanId(plan: string | null | undefined): PlanId {
  const id = (plan ?? "free").toLowerCase();
  if (id === "pro" || id === "enterprise") return "pro";
  if (id === "standard") return "standard";
  return "free";
}

export function planOf(plan: string | null | undefined): PlanLimits {
  return PLANS[normalizePlanId(plan)];
}

export function hasFeature(plan: string | null | undefined, feature: FeatureKey): boolean {
  return planOf(plan).features[feature];
}

export function withinLimit(
  plan: string | null | undefined,
  limit: "transactionsPerMonth" | "taxProfiles" | "brokerAccounts",
  current: number,
): boolean {
  const max = planOf(plan)[limit];
  return max === null || current < max;
}

export function limitLabel(
  plan: string | null | undefined,
  limit: "transactionsPerMonth" | "taxProfiles" | "brokerAccounts",
): string {
  const max = planOf(plan)[limit];
  return max === null ? "Unlimited" : String(max);
}

export function priceLabel(plan: PlanLimits, period: ChargePeriod): string {
  if (plan.monthlyPrice === 0) return "$0";
  const amount = period === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  return `$${amount}`;
}

export function periodSuffix(plan: PlanLimits, period: ChargePeriod): string {
  if (plan.monthlyPrice === 0) return "";
  return period === "yearly" ? "/yr" : "/mo";
}

export function kelviqCheckoutUrl(opts: {
  plan: PlanId;
  period?: ChargePeriod | undefined;
  orgId?: string | null | undefined;
  checkoutBase?: string | undefined;
}): string {
  const base = opts.checkoutBase || KELVIQ_CHECKOUT_URL;
  const limits = PLANS[opts.plan];
  let url = base;
  url = url.replace(/plan_identifier=[a-z-]+/, `plan_identifier=${limits.kelviqPlan}`);
  if (opts.plan === "free") {
    url = url.replace(/charge_period=[A-Z_]+/, "charge_period=ONE_TIME");
  } else {
    const period = opts.period === "yearly" ? "YEARLY" : "MONTHLY";
    url = url.replace(/charge_period=[A-Z_]+/, `charge_period=${period}`);
    if (!/[?&]charge_period=/.test(url)) {
      url += `${url.includes("?") ? "&" : "?"}charge_period=${period}`;
    }
  }
  if (opts.orgId) {
    url += `${url.includes("?") ? "&" : "?"}metadata[org_id]=${encodeURIComponent(opts.orgId)}`;
  }
  return url;
}

/** Prefer cheaper cascade entries for Basic; keep full quality for Pro. */
export function pickCascadeForPlan<
  T extends { modelId: string },
>(cascade: T[], plan: string | null | undefined, fallback: T): T {
  const id = normalizePlanId(plan);
  if (id === "pro" || cascade.length === 0) return fallback;
  const cheap = (m: string) =>
    /mini|flash|haiku|:free|8b|7b|small|lite/i.test(m);
  if (id === "free") {
    return cascade.find((c) => cheap(c.modelId)) ?? fallback;
  }
  const mid = cascade.find((c) => /mini|flash/i.test(c.modelId));
  return mid ?? fallback;
}
