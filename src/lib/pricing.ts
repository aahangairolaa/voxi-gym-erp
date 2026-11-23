/**
 * VOXI subscription pricing (what VOXI sells to gyms). All amounts in QAR.
 * One plan with everything included. Change the numbers here and the landing
 * page, /pricing, the in-app Billing page and the admin screen all follow.
 */

/** Billing terms. 12 months is the reference price; shorter terms cost more per month. */
export const TERMS = [
  { months: 3, price: 11_000, label: "3 months", name: "Quarterly", tagline: "Try VOXI properly, with room to grow." },
  { months: 6, price: 16_500, label: "6 months", name: "Half-year", tagline: "For gyms settling into a smarter routine." },
  { months: 12, price: 25_000, label: "12 months", name: "Annual", tagline: "The best value for gyms that are here to stay." },
] as const;

export type TermMonths = (typeof TERMS)[number]["months"];
export const DEFAULT_TERM: TermMonths = 12;

/** Extra branch, per branch, for a 12-month term (shorter terms are priced pro rata). */
export const BRANCH_PRICE_YEAR = 12_000;
/** Locations per gym: the main one plus up to 4 added branches (5 in total). */
export const MAX_LOCATIONS = 5;
export const MAX_EXTRA_BRANCHES = MAX_LOCATIONS - 1;
/**
 * Discount on each added branch (Branch 2 = the first one you add): Branch 2 full price,
 * Branch 3 20% off, then much cheaper from Branch 4 (50% off) and Branch 5 (60% off).
 */
export const BRANCH_DISCOUNTS = [0, 0.2, 0.5, 0.6] as const;

const round10 = (n: number) => Math.round(n / 10) * 10;

export function termFor(months: number) {
  return TERMS.find((t) => t.months === months) ?? TERMS[TERMS.length - 1];
}

/** VOXI Café add-on (menu, café sales, café team), per 12 months; shorter terms pro rata. */
export const CAFE_PRICE_YEAR = 8_000;
/** Most items a gym café menu can hold. */
export const MAX_CAFE_ITEMS = 14;

export function cafePrice(months: number) {
  return round10(CAFE_PRICE_YEAR * (termFor(months).price / 25_000));
}

/** Price of one added branch before any discount, for a given term. */
export function branchListPrice(months: number) {
  return round10(BRANCH_PRICE_YEAR * (termFor(months).price / 25_000));
}

/** Price of the n-th added branch (1-based) for a given term, after its discount. */
export function branchPrice(n: number, months: number) {
  const discount = BRANCH_DISCOUNTS[Math.min(n, BRANCH_DISCOUNTS.length) - 1] ?? 0;
  return round10(branchListPrice(months) * (1 - discount));
}

export type Quote = {
  months: number;
  termLabel: string;
  base: number;
  extraBranches: number;
  branches: { n: number; price: number; listPrice: number; discount: number }[];
  branchTotal: number;
  /** VOXI Café add-on for this term (0 when not chosen). */
  cafe: number;
  total: number;
  perMonth: number;
  /** Saving compared with renewing the shortest term for the same period. */
  saving: number;
};

export function quote(months: number, extraBranches: number, cafe = false): Quote {
  const term = termFor(months);
  const count = Math.max(0, Math.min(MAX_EXTRA_BRANCHES, Math.floor(extraBranches)));
  const branches = Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    price: branchPrice(i + 1, term.months),
    listPrice: branchListPrice(term.months),
    discount: BRANCH_DISCOUNTS[i] ?? 0,
  }));
  const branchTotal = branches.reduce((s, b) => s + b.price, 0);
  const cafeTotal = cafe ? cafePrice(term.months) : 0;
  const total = term.price + branchTotal + cafeTotal;
  const short = TERMS[0];
  const times = term.months / short.months;
  const shortEquivalent =
    short.price * times + branches.reduce((s, b) => s + branchPrice(b.n, short.months) * times, 0) + (cafe ? cafePrice(short.months) * times : 0);
  return {
    months: term.months,
    termLabel: term.label,
    base: term.price,
    extraBranches: count,
    branches,
    branchTotal,
    cafe: cafeTotal,
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

/** Biometric entrance: one-time, per entrance. Each extra entrance gets a little more off. */
export const ENTRANCE_PRICE = 1_500;
/** Discount on the 1st, 2nd, 3rd... entrance; the 5th and every one after it get the last value. */
export const ENTRANCE_DISCOUNTS = [0, 0.05, 0.1, 0.15, 0.2] as const;
export const MAX_ENTRANCES = 10;

export function entranceDiscount(n: number) {
  return ENTRANCE_DISCOUNTS[Math.min(n, ENTRANCE_DISCOUNTS.length) - 1] ?? 0;
}
export function entrancePrice(n: number) {
  return round10(ENTRANCE_PRICE * (1 - entranceDiscount(n)));
}

/** One-time services that can be added at checkout. */
export const ONE_TIME_ADDONS = [
  { id: "biometric", name: "Biometric entrance", price: ENTRANCE_PRICE, unit: "per entrance", note: "Face or fingerprint terminal, turnstile wiring and member enrolment.", perUnit: true },
  { id: "onboarding", name: "Onboarding and data migration", price: 1_500, unit: "one-time", note: "We import your members, plans and balances. Free with the annual plan.", freeOnAnnual: true },
] as const;
export type AddonId = (typeof ONE_TIME_ADDONS)[number]["id"];

/** Price of the one-time services chosen (onboarding is free on 12 months). */
export function addonsTotal(months: number, entrances: number, onboarding: boolean) {
  const count = Math.max(0, Math.min(MAX_ENTRANCES, Math.floor(entrances)));
  const lines = Array.from({ length: count }, (_, i) => ({ n: i + 1, price: entrancePrice(i + 1), listPrice: ENTRANCE_PRICE, discount: entranceDiscount(i + 1) }));
  const bio = lines.reduce((s, l) => s + l.price, 0);
  const onb = onboarding && months !== 12 ? ONE_TIME_ADDONS[1].price : 0;
  return { entrances: lines, biometric: bio, biometricList: ENTRANCE_PRICE * count, onboarding: onb, total: bio + onb };
}

// ── Promo codes ──────────────────────────────────────────────────────────────
export type PromoKind = "PERCENT" | "AMOUNT";
/** What a promo takes money off: everything, the subscription only, or the one-time services only. */
export type PromoScope = "ALL" | "SUBSCRIPTION" | "ONE_TIME";

/** The public side of a promo code, as the Billing page receives it. */
export type Promo = { code: string; kind: PromoKind; value: number; appliesTo: PromoScope; minMonths: number | null; label: string };

export function promoLabel(p: Pick<Promo, "kind" | "value" | "appliesTo">) {
  const amount = p.kind === "PERCENT" ? `${p.value}% off` : `QAR ${p.value.toLocaleString("en")} off`;
  const scope = p.appliesTo === "SUBSCRIPTION" ? " the subscription" : p.appliesTo === "ONE_TIME" ? " one-time services" : "";
  return `${amount}${scope}`;
}

/** Money a promo takes off the first invoice. Never more than what it applies to. */
export function promoDiscount(p: Promo | null | undefined, months: number, subscription: number, oneTime: number) {
  if (!p) return 0;
  if (p.minMonths && months < p.minMonths) return 0;
  const base = p.appliesTo === "SUBSCRIPTION" ? subscription : p.appliesTo === "ONE_TIME" ? oneTime : subscription + oneTime;
  const off = p.kind === "PERCENT" ? Math.round((base * Math.min(100, p.value)) / 100) : p.value;
  return Math.max(0, Math.min(base, off));
}

export type Checkout = {
  quote: Quote;
  oneTime: ReturnType<typeof addonsTotal>;
  /** Everything at full price, before any discount. */
  listTotal: number;
  /** Multi-branch and multi-entrance discounts, plus free onboarding on Annual. */
  volumeDiscount: number;
  promo: Promo | null;
  promoDiscount: number;
  /** What the gym pays on the first invoice. */
  totalToday: number;
  /** What each renewal costs (promo codes apply to the first invoice only). */
  renewal: number;
};

/** The full price picture for a plan choice: list prices, every discount, and the net total. */
export function checkout(months: number, extraBranches: number, entrances: number, onboarding: boolean, promo?: Promo | null, cafe = false): Checkout {
  const q = quote(months, extraBranches, cafe);
  const one = addonsTotal(q.months, entrances, onboarding);
  const branchList = q.branches.reduce((s, b) => s + b.listPrice, 0);
  // Annual always includes onboarding, so it counts as a saving there
  const freeOnboarding = q.months === 12 ? ONE_TIME_ADDONS[1].price : 0;
  const listTotal = q.base + branchList + q.cafe + one.biometricList + one.onboarding + freeOnboarding;
  const volumeDiscount = branchList - q.branchTotal + (one.biometricList - one.biometric) + freeOnboarding;
  const valid = promo && (!promo.minMonths || q.months >= promo.minMonths) ? promo : null;
  const promoOff = promoDiscount(valid, q.months, q.total, one.total);
  return {
    quote: q,
    oneTime: one,
    listTotal,
    volumeDiscount,
    promo: valid ?? null,
    promoDiscount: promoOff,
    totalToday: q.total + one.total - promoOff,
    renewal: q.total,
  };
}

/** A gym is locked when VOXI suspended it or its free trial has run out without a plan. */
export function gymLocked(gym: { status: string; trialEndsAt?: Date | string | null }) {
  if (gym.status === "SUSPENDED") return true;
  return gym.status === "TRIAL" && !!gym.trialEndsAt && new Date(gym.trialEndsAt).getTime() <= Date.now();
}
