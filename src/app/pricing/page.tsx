import type { Metadata } from "next";
import { LuCheck } from "react-icons/lu";
import { ADD_ONS } from "@/components/marketing/pricing-data";
import { PricingTable } from "@/components/marketing/pricing-table";
import { SiteFooter, SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Pricing",
  description: "VOXI gym management plans in Qatari Riyal (QAR). Essential, Professional and Elite.",
};

const COMPARE: [string, string | boolean, string | boolean, string | boolean][] = [
  ["Branches", "1", "Up to 3", "Unlimited"],
  ["Active members", "300", "1,500", "Unlimited"],
  ["Staff accounts", "3", "Unlimited", "Unlimited"],
  ["Members, plans & memberships", true, true, true],
  ["Payments, receipts & cash drawer", true, true, true],
  ["Front-desk check-in", true, true, true],
  ["Reports & Excel export", true, true, true],
  ["Biometric integration", false, "1 device / branch", "Unlimited"],
  ["Workouts, classes & leaderboard", false, true, true],
  ["Leads pipeline", false, true, true],
  ["API access & custom integrations", false, false, true],
  ["Data migration", "Paid add-on", "Paid add-on", "Included"],
  ["Support", "Email", "Priority WhatsApp", "Dedicated manager + on-site"],
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <LuCheck className="mx-auto h-5 w-5 text-brand-600" />;
  if (v === false) return <span className="text-line-strong">—</span>;
  return <span className="text-sm">{v}</span>;
}

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
              Premium software, <span className="text-gradient">honest pricing</span>
            </h1>
            <p className="mt-4 text-muted">Every plan includes free updates, daily backups and secure cloud hosting. Start with a 14-day free trial.</p>
          </div>
          <PricingTable />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Add-ons</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ADD_ONS.map((a) => (
            <div key={a.name} className="card p-6">
              <p className="font-semibold">{a.name}</p>
              <p className="mt-3 font-display text-2xl font-semibold">{a.price}</p>
              <p className="text-xs text-muted">{a.unit}</p>
              <p className="mt-3 text-sm text-muted">{a.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Compare plans</h2>
        <div className="card overflow-x-auto">
          <table className="table min-w-[640px]">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="text-center">Essential</th>
                <th className="text-center text-brand-600!">Professional</th>
                <th className="text-center">Elite</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([f, a, b, c]) => (
                <tr key={f}>
                  <td className="font-medium">{f}</td>
                  <td className="text-center">
                    <Cell v={a} />
                  </td>
                  <td className="bg-brand-50/40 text-center dark:bg-brand-500/5">
                    <Cell v={b} />
                  </td>
                  <td className="text-center">
                    <Cell v={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
