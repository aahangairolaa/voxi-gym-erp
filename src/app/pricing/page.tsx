import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";
import { SiteFooter, SiteNav } from "@/components/marketing/site-nav";
import { BRANCH_DISCOUNTS, ENTRANCE_DISCOUNTS, ENTRANCE_PRICE, MAX_LOCATIONS, TERMS, TRIAL_DAYS, branchListPrice, branchPrice, entrancePrice } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "VOXI gym management in Qatari Riyal (QAR). One plan with every feature, from QAR 25,000 a year, plus discounted branch add-ons.",
};

const fmt = (n: number) => n.toLocaleString("en");

const FAQ = [
  ["How do I pay?", "After your trial, choose a term and branches on the Billing page inside VOXI. We send an invoice and you pay by bank transfer, card or Fawran. Your plan starts the day payment arrives."],
  ["Can I add a branch later?", `Yes. Run up to ${MAX_LOCATIONS} locations and add branches any time from Billing. The 2nd branch you add is 20% off, and every one after it costs even less.`],
  ["Do you have promo codes?", "Yes, from time to time. Enter your code on the Billing page when you choose your plan and the discount comes off your first invoice."],
  ["What happens when my trial ends?", "Nothing is deleted. Choose a plan to keep going, and everything you set up during the trial stays exactly as it is."],
  ["Is there a contract?", "Only the term you choose. Pick 3, 6 or 12 months. Longer terms cost less per month."],
];

export default function PricingPage() {
  return (
    <div className="bg-bg">
      <SiteNav />
      <section className="relative overflow-hidden px-5 pt-32 pb-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(50%_60%_at_50%_0%,var(--glow),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-brand-600 uppercase">Pricing · Qatari Riyal</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Every feature. <span className="text-gradient">Your terms.</span>
            </h1>
            <p className="mt-4 text-muted">
              Choose your plan, then tailor it with branches and setup services. Start with a {TRIAL_DAYS}-day free trial, no card needed.
            </p>
          </div>
          <PricingTable />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-2xl font-semibold tracking-tight">Branch pricing</h2>
        <p className="mt-2 mb-6 max-w-2xl text-sm text-muted">
          Your main location is included. Every branch you add is discounted more than the one before it.
        </p>
        <div className="card overflow-x-auto">
          <table className="table min-w-[640px]">
            <thead>
              <tr>
                <th>Branch</th>
                <th className="text-right">Discount</th>
                {TERMS.map((t) => (
                  <th key={t.months} className="text-right">
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRANCH_DISCOUNTS.map((d, i) => (
                <tr key={i}>
                  <td className="font-medium">Branch {i + 2}</td>
                  <td className="text-right text-sm text-emerald-600 dark:text-emerald-400">{d ? `${Math.round(d * 100)}% off` : "Full price"}</td>
                  {TERMS.map((t) => (
                    <td key={t.months} className="text-right tabular-nums">
                      {d > 0 && <s className="mr-1.5 text-muted decoration-1">{fmt(branchListPrice(t.months))}</s>}
                      QAR {fmt(branchPrice(i + 1, t.months))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-14 text-2xl font-semibold tracking-tight">Biometric entrances</h2>
        <p className="mt-2 mb-6 max-w-2xl text-sm text-muted">
          A one-time price per entrance: terminal, turnstile wiring and member enrolment. Every extra entrance gets a little more off.
        </p>
        <div className="card overflow-x-auto">
          <table className="table min-w-[480px]">
            <thead>
              <tr>
                <th>Entrance</th>
                <th className="text-right">Discount</th>
                <th className="text-right">One-time price</th>
              </tr>
            </thead>
            <tbody>
              {ENTRANCE_DISCOUNTS.map((d, i) => (
                <tr key={i}>
                  <td className="font-medium">{i === ENTRANCE_DISCOUNTS.length - 1 ? `Entrance ${i + 1} and up` : `Entrance ${i + 1}`}</td>
                  <td className="text-right text-sm text-emerald-600 dark:text-emerald-400">{d ? `${Math.round(d * 100)}% off` : "Full price"}</td>
                  <td className="text-right tabular-nums">
                    {d > 0 && <s className="mr-1.5 text-muted decoration-1">{fmt(ENTRANCE_PRICE)}</s>}
                    QAR {fmt(entrancePrice(i + 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      <section className="mx-auto max-w-3xl px-5 pb-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Billing questions</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-brand-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
