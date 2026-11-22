/**
 * VOXI subscription pricing (what VOXI sells to gyms). All amounts in QAR.
 * One plan with everything included. Change the numbers here and the landing
 * page, /pricing, the in-app Billing page and the admin screen all follow.
 */

/** Billing terms. 12 months is the reference price; shorter terms cost more per month. */
export const TERMS = [
  { months: 3, price: 10_000, label: "3 months", name: "Quarterly", tagline: "Try VOXI properly, with room to grow." },
  { months: 6, price: 15_000, label: "6 months", name: "Half-year", tagline: "For gyms settling into a smarter routine." },
  { months: 12, price: 25_000, label: "12 months", name: "Annual", tagline: "The best value for gyms that are here to stay." },
] as const;

export type TermMonths = (typeof TERMS)[number]["months"];
export const DEFAULT_TERM: TermMonths = 12;

/** Extra branch, per branch, for a 12-month term. */
export const BRANCH_PRICE_YEAR = 14_000;
/** Locations per gym: the main one plus up to 4 added branches (5 in total). */
export const MAX_LOCATIONS = 5;
export const MAX_EXTRA_BRANCHES = MAX_LOCATIONS - 1;
/** Discount on the 1st, 2nd, 3rd... added branch. Every new branch costs less. */
export const BRANCH_DISCOUNTS = [0, 0.05, 0.1, 0.15] as const;

const round10 = (n: number) => Math.round(n / 10) * 10;

export function termFor(months: number) {
  return TERMS.find((t) => t.months === months) ?? TERMS[TERMS.length - 1];
}

/** Price of the n-th added branch (1-based) for a given term. */
export function branchPrice(n: number, months: number) {
  const term = termFor(months);
  const discount = BRANCH_DISCOUNTS[Math.min(n, BRANCH_DISCOUNTS.length) - 1] ?? 0;
  return round10(BRANCH_PRICE_YEAR * (term.price / 25_000) * (1 - discount));
}

export type Quote = {
  months: number;
  termLabel: string;
  base: number;
  extraBranches: number;
  branches: { n: number; price: number; discount: number }[];
  branchTotal: number;
  total: number;
  perMonth: number;
  /** Saving compared with renewing the shortest term for the same period. */
  saving: number;
};

export function quote(months: number, extraBranches: number): Quote {
  const term = termFor(months);
  const count = Math.max(0, Math.min(MAX_EXTRA_BRANCHES, Math.floor(extraBranches)));
  const branches = Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    price: branchPrice(i + 1, term.months),
    discount: BRANCH_DISCOUNTS[i] ?? 0,
  }));
  const branchTotal = branches.reduce((s, b) => s + b.price, 0);
  const total = term.price + branchTotal;
  const short = TERMS[0];
  const times = term.months / short.months;
  const shortEquivalent = short.price * times + branches.reduce((s, b) => s + branchPrice(b.n, short.months) * times, 0);
  return {
    months: term.months,
    termLabel: term.label,
    base: term.price,
    extraBranches: count,
    branches,
    branchTotal,
    total,
    perMonth: Math.round(total / term.months),
    saving: Math.max(0, Math.round(shortEquivalent - total)),
  };
}

export const qar = (n: number) => `QAR ${n.toLocaleString("en")}`;

/** What every VOXI subscription includes. */
export const INCLUDED = [
  "Unlimited members and staff accounts",
  "Members, plans, memberships and renewals",
  "Payments in QAR, invoices and cash drawer",
  "Front-desk check-in and live attendance",
  "Biometric access integration",
  "Workouts, classes and leaderboard",
  "Leads pipeline and WhatsApp reminders",
  "Reports, Excel export and activity log",
  "Digital member cards with QR",
  "Daily backups and secure cloud hosting",
  "Priority WhatsApp support",
];

export const TRIAL_DAYS = 7;

/** One-time services that can be added at checkout. */
export const ONE_TIME_ADDONS = [
  { id: "biometric", name: "Biometric entrance", price: 2_900, unit: "per entrance", note: "Face or fingerprint terminal, turnstile wiring and member enrolment.", perUnit: true },
  { id: "onboarding", name: "Onboarding and data migration", price: 1_500, unit: "one-time", note: "We import your members, plans and balances. Free with the annual plan.", freeOnAnnual: true },
] as const;
export type AddonId = (typeof ONE_TIME_ADDONS)[number]["id"];

/** Price of the one-time services chosen (onboarding is free on 12 months). */
export function addonsTotal(months: number, entrances: number, onboarding: boolean) {
  const bio = ONE_TIME_ADDONS[0].price * Math.max(0, Math.min(20, Math.floor(entrances)));
  const onb = onboarding && months !== 12 ? ONE_TIME_ADDONS[1].price : 0;
  return { biometric: bio, onboarding: onb, total: bio + onb };
}

/** A gym is locked when VOXI suspended it or its free trial has run out without a plan. */
export function gymLocked(gym: { status: string; trialEndsAt?: Date | string | null }) {
  if (gym.status === "SUSPENDED") return true;
  return gym.status === "TRIAL" && !!gym.trialEndsAt && new Date(gym.trialEndsAt).getTime() <= Date.now();
}
