"use client";
import { CONTACT } from "@/lib/contact";
import { useState } from "react";
import { LuCheck, LuSparkles } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { VOXI_PLANS } from "./pricing-data";

const fmt = (n: number) => n.toLocaleString("en");

export function PricingTable() {
  const [annual, setAnnual] = useState(true);
  return (
    <div>
      <div className="mb-10 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-semibold", !annual ? "text-ink" : "text-muted")}>Monthly</span>
        <button
          onClick={() => setAnnual((a) => !a)}
          className={cn("relative h-7 w-12 rounded-full transition-colors", annual ? "bg-brand-600" : "bg-line-strong")}
          aria-label="Toggle annual billing"
        >
          <span className={cn("absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300", annual && "translate-x-5")} />
        </button>
        <span className={cn("text-sm font-semibold", annual ? "text-ink" : "text-muted")}>
          Yearly <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">2 months free</span>
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {VOXI_PLANS.map((p) => {
          const price = annual ? Math.round((p.monthly * 10) / 12) : p.monthly;
          return (
            <div
              key={p.name}
              className={cn(
                "relative flex flex-col rounded-3xl border p-7 transition duration-300 hover:-translate-y-1",
                p.highlight
                  ? "border-transparent bg-[#120c30] text-white shadow-[0_30px_80px_-30px_rgba(106,68,242,0.9)]"
                  : "card",
              )}
            >
              {p.highlight && (
                <>
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(80%_60%_at_50%_0%,rgba(124,92,255,0.45),transparent_70%)]" />
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-brand-400/40 ring-inset" />
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white brand-gradient shadow-lg">
                    <LuSparkles className="h-3 w-3" /> Most popular
                  </span>
                </>
              )}
              <div className="relative">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className={cn("mt-1 text-sm", p.highlight ? "text-white/65" : "text-muted")}>{p.tagline}</p>
                <div className="mt-6 flex items-end gap-1.5">
                  <span className={cn("mb-1.5 text-sm font-semibold", p.highlight ? "text-white/70" : "text-muted")}>QAR</span>
                  <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">{fmt(price)}</span>
                  <span className={cn("mb-1.5 text-sm", p.highlight ? "text-white/60" : "text-muted")}>/month</span>
                </div>
                <p className={cn("mt-1 h-5 text-xs", p.highlight ? "text-white/55" : "text-muted")}>
                  {annual ? `Billed yearly: QAR ${fmt(p.monthly * 10)}` : "Billed monthly · cancel anytime"}
                </p>
                <a
                  href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(`VOXI ${p.name} plan`)}`}
                  className={cn(
                    "mt-6 flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition",
                    p.highlight ? "bg-white text-[#2d1a6e] hover:bg-brand-50" : "border border-line bg-surface hover:border-brand-300 hover:bg-surface-2",
                  )}
                >
                  Start 14-day free trial
                </a>
                <ul className="mt-7 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full", p.highlight ? "bg-brand-400/30 text-brand-200" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300")}>
                        <LuCheck className="h-3 w-3" />
                      </span>
                      <span className={p.highlight ? "text-white/85" : "text-ink-soft"}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-muted">All prices in Qatari Riyal (QAR). No VAT is currently charged in Qatar. Pay by bank transfer, card or Fawran.</p>
    </div>
  );
}
