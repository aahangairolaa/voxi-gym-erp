/**
 * VOXI subscription plans (what YOU sell to gyms). Prices in QAR.
 * Edit the numbers here — the landing page and /pricing both use this table.
 */
export const VOXI_PLANS = [
  {
    name: "Essential",
    tagline: "For a single boutique studio getting organised.",
    monthly: 549,
    highlight: false,
    features: [
      "1 branch",
      "Up to 300 active members",
      "Members, plans & memberships",
      "Payments in QAR, invoices & cash drawer",
      "Front-desk check-in",
      "Core reports & Excel export",
      "3 staff accounts",
      "Email support",
    ],
  },
  {
    name: "Professional",
    tagline: "For premium gyms that want everything automated.",
    monthly: 1099,
    highlight: true,
    features: [
      "Up to 3 branches",
      "Up to 1,500 active members",
      "Everything in Essential",
      "Biometric access integration (1 device / branch)",
      "Workout programmes, classes & leaderboard",
      "Leads pipeline with WhatsApp follow-up",
      "Unlimited staff with role permissions",
      "Priority WhatsApp support",
    ],
  },
  {
    name: "Elite",
    tagline: "For multi-branch clubs and hotel fitness groups.",
    monthly: 1999,
    highlight: false,
    features: [
      "Unlimited branches & members",
      "Everything in Professional",
      "Unlimited biometric devices & turnstiles",
      "Custom integrations & API access",
      "Free data migration from your old system",
      "Dedicated account manager",
      "On-site support in Doha",
    ],
  },
];

export const ADD_ONS = [
  { name: "Biometric hardware & installation", price: "from QAR 2,900", unit: "per entrance, one-time", note: "Face or fingerprint terminal, turnstile wiring and enrolment of your members." },
  { name: "Onboarding & data migration", price: "QAR 1,500", unit: "one-time", note: "We import members, plans and balances from Excel or your old software. Free on Elite." },
  { name: "Extra branch", price: "QAR 299", unit: "per month", note: "Add branches beyond your plan's limit." },
];
