"use client";
import Link from "next/link";
import { useState } from "react";
import { LuCheck, LuMinus, LuPlus } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { DEFAULT_TERM, INCLUDED, MAX_EXTRA_BRANCHES, TERMS, TRIAL_DAYS, quote, type Quote } from "@/lib/pricing";

const fmt = (n: number) => n.toLocaleString("en");

type Props = {
  /** "marketing" shows a free-trial button; "billing" calls onChoose with the quote. */
  mode?: "marketing" | "billing";
  initialMonths?: number;
  initialBranches?: number;
  onChoose?: (q: Quote) => void;
  busy?: boolean;
  chooseLabel?: string;
};

/** One plan, everything included. Pick a term and add branches; the price updates live. */
export function PricingTable({ mode = "marketing", initialMonths = DEFAULT_TERM, initialBranches = 0, onChoose, busy, chooseLabel }: Props) {
  const [months, setMonths] = useState(initialMonths);
  const [branches, setBranches] = useState(initialBranches);
  const q = quote(months, branches);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      {/* Configure */}
      <div className="card p-6 sm:p-8">
        <p className="text-sm font-semibold text-ink">Billing term</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TERMS.map((t) => {
            const active = t.months === months;
            const tq = quote(t.months, 0);
            return (
              <button
                key={t.months}
                type="button"
                onClick={() => setMonths(t.months)}
                className={cn(
                  "relative rounded-2xl border px-3 py-3.5 text-left transition",
                  active ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-500/10" : "border-line bg-surface hover:border-brand-300",
                )}
              >
                {t.months === 12 && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-[#120c30] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">Best value</span>
                )}
                <span className="block text-sm font-semibold text-ink">{t.label}</span>
                <span className="mt-0.5 block text-xs text-muted tabular-nums">QAR {fmt(Math.round(t.price / t.months))} / mo</span>
                {tq.saving > 0 && <span className="mt-1 block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Save QAR {fmt(tq.saving)}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Extra branches</p>
            <p className="mt-0.5 text-xs text-muted">Your main location is included. Add up to {MAX_EXTRA_BRANCHES} more; every new branch costs less.</p>
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
            <button
              type="button"
              aria-label="Remove a branch"
              disabled={branches === 0}
              onClick={() => setBranches((b) => Math.max(0, b - 1))}
              className="grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:bg-surface-2 disabled:opacity-30"
            >
              <LuMinus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-display text-lg font-semibold tabular-nums">{branches}</span>
            <button
              type="button"
              aria-label="Add a branch"
              disabled={branches >= MAX_EXTRA_BRANCHES}
              onClick={() => setBranches((b) => Math.min(MAX_EXTRA_BRANCHES, b + 1))}
              className="grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:bg-surface-2 disabled:opacity-30"
            >
              <LuPlus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line">
          {Array.from({ length: MAX_EXTRA_BRANCHES }, (_, i) => {
            const on = i < branches;
            const b = quote(months, i + 1).branches[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setBranches(on && i === branches - 1 ? i : i + 1)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-left text-sm transition last:border-b-0",
                  on ? "bg-brand-50/60 dark:bg-brand-500/8" : "bg-surface hover:bg-surface-2",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={cn("grid h-5 w-5 place-items-center rounded-md border", on ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong")}>
                    {on && <LuCheck className="h-3.5 w-3.5" />}
                  </span>
                  <span className={on ? "font-medium text-ink" : "text-ink-soft"}>Branch {i + 2}</span>
                  {b.discount > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {Math.round(b.discount * 100)}% off
                    </span>
                  )}
                </span>
                <span className={cn("tabular-nums", on ? "font-semibold text-ink" : "text-muted")}>QAR {fmt(b.price)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="relative flex flex-col overflow-hidden rounded-3xl bg-[#120c30] p-6 text-white shadow-[0_30px_80px_-30px_rgba(106,68,242,0.9)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(124,92,255,0.45),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-brand-400/40 ring-inset" />
        <div className="relative flex flex-1 flex-col">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">VOXI, all included</p>
          <div className="mt-4 flex items-end gap-1.5">
            <span className="mb-1.5 text-sm font-semibold text-white/70">QAR</span>
            <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">{fmt(q.total)}</span>
          </div>
          <p className="mt-1 text-sm text-white/60">
            for {q.termLabel}
            {q.months > 1 && <> · QAR {fmt(q.perMonth)} per month</>}
          </p>

          <dl className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-white/70">Main location, {q.termLabel}</dt>
              <dd className="tabular-nums">QAR {fmt(q.base)}</dd>
            </div>
            {q.branches.map((b) => (
              <div key={b.n} className="flex justify-between gap-3">
                <dt className="text-white/70">
                  Branch {b.n + 1}
                  {b.discount > 0 && <span className="ml-1.5 text-emerald-300">{Math.round(b.discount * 100)}% off</span>}
                </dt>
                <dd className="tabular-nums">QAR {fmt(b.price)}</dd>
              </div>
            ))}
            {q.saving > 0 && (
              <div className="flex justify-between gap-3 text-emerald-300">
                <dt>You save vs monthly</dt>
                <dd className="tabular-nums">QAR {fmt(q.saving)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-auto pt-7">
            {mode === "marketing" ? (
              <Link
                href="/register"
                className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#2d1a6e] transition hover:bg-brand-50"
              >
                Start {TRIAL_DAYS}-day free trial
              </Link>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => onChoose?.(q)}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#2d1a6e] transition hover:bg-brand-50 disabled:opacity-60"
              >
                {busy ? "Sending..." : (chooseLabel ?? "Choose this plan")}
              </button>
            )}
            <p className="mt-3 text-center text-xs text-white/50">
              {mode === "marketing" ? "No card needed for the trial." : "We confirm and send your invoice within one business day."}
            </p>
          </div>
        </div>
      </div>

      {/* Included */}
      <div className="card p-6 sm:p-8 lg:col-span-2">
        <p className="text-sm font-semibold text-ink">Every subscription includes</p>
        <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <LuCheck className="h-3 w-3" />
              </span>
              <span className="text-ink-soft">{f}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted">All prices in Qatari Riyal (QAR). No VAT is currently charged in Qatar. Pay by bank transfer, card or Fawran.</p>
      </div>
    </div>
  );
}
