"use client";
import Link from "next/link";
import { useState } from "react";
import { LuCheck, LuFingerprint, LuMapPin, LuMinus, LuPlus, LuSparkles, LuUpload } from "react-icons/lu";
import { cn } from "@/lib/utils";
import {
  BRANCH_DISCOUNTS, DEFAULT_TERM, INCLUDED, MAX_EXTRA_BRANCHES, ONE_TIME_ADDONS, TERMS, TRIAL_DAYS, addonsTotal, branchPrice, quote, type Quote,
} from "@/lib/pricing";

const fmt = (n: number) => n.toLocaleString("en");

export type PlanChoice = { quote: Quote; entrances: number; onboarding: boolean; oneTime: number };

type Props = {
  /** "marketing" ends with a free-trial button; "billing" calls onChoose with the selection. */
  mode?: "marketing" | "billing";
  initialMonths?: number;
  initialBranches?: number;
  onChoose?: (c: PlanChoice) => void;
  busy?: boolean;
  chooseLabel?: string;
};

function Stepper({ value, min = 0, max, onChange, label }: { value: number; min?: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:bg-surface-2 disabled:opacity-30">
        <LuMinus className="h-4 w-4" />
      </button>
      <span className="w-9 text-center font-display text-lg font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:bg-surface-2 disabled:opacity-30">
        <LuPlus className="h-4 w-4" />
      </button>
    </div>
  );
}

function StepLabel({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
      <div className="flex items-center gap-3">
        <span className="font-display text-sm font-semibold text-brand-600 tabular-nums dark:text-brand-300">{n}</span>
        <span className="h-px w-8 bg-brand-300/60" />
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
      </div>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

/** One VOXI subscription: pick a term, tailor it with add-ons, see the total. */
export function PricingTable({ mode = "marketing", initialMonths = DEFAULT_TERM, initialBranches = 0, onChoose, busy, chooseLabel }: Props) {
  const [months, setMonths] = useState<number>(TERMS.some((t) => t.months === initialMonths) ? initialMonths : DEFAULT_TERM);
  const [branches, setBranches] = useState(Math.min(initialBranches, MAX_EXTRA_BRANCHES));
  const [entrances, setEntrances] = useState(0);
  const [onboarding, setOnboarding] = useState(false);
  const q = quote(months, branches);
  const one = addonsTotal(months, entrances, onboarding);
  const annual = months === 12;

  return (
    <div className="space-y-14">
      {/* 01: plans */}
      <div>
        <StepLabel n="01" title="Choose your plan" hint="Every plan includes every feature." />
        <div className="grid gap-5 lg:grid-cols-3">
          {TERMS.map((t) => {
            const tq = quote(t.months, 0);
            const selected = t.months === months;
            const dark = t.months === 12;
            const perks = [
              "Every VOXI feature",
              "Unlimited members and staff",
              `Billed every ${t.label}`,
              ...(tq.saving > 0 ? [`Save QAR ${fmt(tq.saving)} vs quarterly`] : []),
              ...(t.months === 12 ? ["Free onboarding and data migration"] : []),
            ];
            return (
              <button
                key={t.months}
                type="button"
                onClick={() => setMonths(t.months)}
                aria-pressed={selected}
                className={cn(
                  "group relative flex flex-col rounded-3xl border p-7 text-left transition duration-300 hover:-translate-y-1",
                  dark ? "border-transparent bg-[#120c30] text-white shadow-[0_30px_80px_-30px_rgba(106,68,242,0.9)]" : "card",
                  selected && !dark && "ring-2 ring-brand-500",
                  selected && dark && "ring-2 ring-brand-300",
                )}
              >
                {dark && (
                  <>
                    <span className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(80%_60%_at_50%_0%,rgba(124,92,255,0.45),transparent_70%)]" />
                    <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-brand-400/40 ring-inset" />
                    <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white brand-gradient shadow-lg">
                      <LuSparkles className="h-3 w-3" /> Best value
                    </span>
                  </>
                )}
                <span className="relative flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-xl font-semibold">{t.name}</span>
                    <span className={cn("mt-1 block text-sm", dark ? "text-white/65" : "text-muted")}>{t.tagline}</span>
                  </span>
                  <span
                    className={cn(
                      "mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition",
                      selected ? (dark ? "border-white bg-white text-[#2d1a6e]" : "border-brand-600 bg-brand-600 text-white") : dark ? "border-white/30" : "border-line-strong",
                    )}
                  >
                    {selected && <LuCheck className="h-3.5 w-3.5" />}
                  </span>
                </span>
                <span className="relative mt-7 flex items-end gap-1.5">
                  <span className={cn("mb-1.5 text-sm font-semibold", dark ? "text-white/70" : "text-muted")}>QAR</span>
                  <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">{fmt(Math.round(t.price / t.months))}</span>
                  <span className={cn("mb-1.5 text-sm", dark ? "text-white/60" : "text-muted")}>/month</span>
                </span>
                <span className={cn("relative mt-1 block text-xs", dark ? "text-white/55" : "text-muted")}>QAR {fmt(t.price)} billed every {t.label}</span>
                <span className={cn("relative my-6 h-px", dark ? "bg-white/10" : "bg-line")} />
                <span className="relative space-y-3">
                  {perks.map((f) => (
                    <span key={f} className="flex items-start gap-2.5 text-sm">
                      <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full", dark ? "bg-brand-400/30 text-brand-200" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300")}>
                        <LuCheck className="h-3 w-3" />
                      </span>
                      <span className={dark ? "text-white/85" : "text-ink-soft"}>{f}</span>
                    </span>
                  ))}
                </span>
                <span
                  className={cn(
                    "relative mt-8 flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition",
                    dark ? "bg-white text-[#2d1a6e] group-hover:bg-brand-50" : selected ? "bg-brand-600 text-white" : "border border-line bg-surface group-hover:border-brand-300",
                  )}
                >
                  {selected ? "Selected" : `Choose ${t.name}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 02: add-ons */}
      <div>
        <StepLabel n="02" title="Tailor it with add-ons" hint="All optional. Change them any time from Billing." />
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Branches */}
          <div className="card flex flex-col p-6 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white brand-gradient shadow-[0_8px_20px_-8px_rgba(106,68,242,0.8)]">
                  <LuMapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-ink">Extra branches</p>
                  <p className="mt-0.5 text-sm text-muted">Your main location is included. Run up to 5 in total; every new branch costs less.</p>
                </div>
              </div>
              <Stepper value={branches} max={MAX_EXTRA_BRANCHES} onChange={setBranches} label="branches" />
            </div>
            <div className="mt-5 grid flex-1 content-start gap-2">
              {BRANCH_DISCOUNTS.map((d, i) => {
                const on = i < branches;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBranches(on && i === branches - 1 ? i : i + 1)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition",
                      on ? "border-brand-400 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10" : "border-line bg-surface hover:border-brand-300",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={cn("grid h-5 w-5 place-items-center rounded-md border", on ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong")}>
                        {on && <LuCheck className="h-3.5 w-3.5" />}
                      </span>
                      <span className={on ? "font-medium text-ink" : "text-ink-soft"}>Branch {i + 2}</span>
                      {d > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{Math.round(d * 100)}% off</span>}
                    </span>
                    <span className={cn("tabular-nums", on ? "font-semibold text-ink" : "text-muted")}>QAR {fmt(branchPrice(i + 1, months))}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {/* Biometric */}
            <div className="card flex-1 p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <LuFingerprint className="h-5 w-5" />
                </span>
                <Stepper value={entrances} max={10} onChange={setEntrances} label="entrances" />
              </div>
              <p className="mt-4 font-semibold text-ink">{ONE_TIME_ADDONS[0].name}</p>
              <p className="mt-0.5 text-sm text-muted">{ONE_TIME_ADDONS[0].note}</p>
              <p className="mt-3 text-sm font-semibold text-ink tabular-nums">QAR {fmt(ONE_TIME_ADDONS[0].price)} <span className="font-normal text-muted">per entrance, one-time</span></p>
            </div>
            {/* Onboarding */}
            <button
              type="button"
              onClick={() => !annual && setOnboarding((o) => !o)}
              className={cn("card flex-1 p-6 text-left transition", !annual && "hover:border-brand-300", (onboarding || annual) && "border-brand-400 dark:border-brand-500/50")}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <LuUpload className="h-5 w-5" />
                </span>
                <span className={cn("relative h-7 w-12 rounded-full transition-colors", onboarding || annual ? "bg-brand-600" : "bg-line-strong")}>
                  <span className={cn("absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300", (onboarding || annual) && "translate-x-5")} />
                </span>
              </span>
              <span className="mt-4 block font-semibold text-ink">{ONE_TIME_ADDONS[1].name}</span>
              <span className="mt-0.5 block text-sm text-muted">We import your members, plans and balances from Excel or your old software.</span>
              <span className="mt-3 block text-sm font-semibold text-ink tabular-nums">
                {annual ? <span className="text-emerald-600 dark:text-emerald-400">Included free with Annual</span> : <>QAR {fmt(ONE_TIME_ADDONS[1].price)} <span className="font-normal text-muted">one-time</span></>}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 03: summary */}
      <div>
        <StepLabel n="03" title="Your VOXI" />
        <div className="relative overflow-hidden rounded-[28px] bg-[#120c30] p-7 text-white shadow-[0_30px_80px_-30px_rgba(106,68,242,0.9)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(124,92,255,0.45),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-brand-400/40 ring-inset" />
          <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-white/70">{TERMS.find((t) => t.months === months)?.name} plan, {q.termLabel}</dt>
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
              {entrances > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-white/70">Biometric entrance × {entrances} <span className="text-white/45">one-time</span></dt>
                  <dd className="tabular-nums">QAR {fmt(one.biometric)}</dd>
                </div>
              )}
              {(onboarding || annual) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-white/70">Onboarding and migration <span className="text-white/45">one-time</span></dt>
                  <dd className="tabular-nums">{annual ? <span className="text-emerald-300">Free</span> : `QAR ${fmt(one.onboarding)}`}</dd>
                </div>
              )}
              {q.saving > 0 && (
                <div className="flex justify-between gap-3 border-t border-white/10 pt-3 text-emerald-300">
                  <dt>You save vs quarterly billing</dt>
                  <dd className="tabular-nums">QAR {fmt(q.saving)}</dd>
                </div>
              )}
            </dl>

            <div className="flex flex-col justify-between gap-6 lg:border-l lg:border-white/10 lg:pl-10">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">Total today</p>
                <p className="mt-2 flex items-end gap-1.5">
                  <span className="mb-1.5 text-sm font-semibold text-white/70">QAR</span>
                  <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">{fmt(q.total + one.total)}</span>
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Then QAR {fmt(q.total)} every {q.termLabel}
                  {q.months > 1 && <> · QAR {fmt(q.perMonth)} per month</>}
                </p>
              </div>
              <div>
                {mode === "marketing" ? (
                  <Link href="/register" className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#2d1a6e] transition hover:bg-brand-50">
                    Start {TRIAL_DAYS}-day free trial
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onChoose?.({ quote: q, entrances, onboarding: onboarding && !annual, oneTime: one.total })}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#2d1a6e] transition hover:bg-brand-50 disabled:opacity-60"
                  >
                    {busy ? "Sending..." : (chooseLabel ?? "Choose this plan")}
                  </button>
                )}
                <p className="mt-3 text-center text-xs text-white/50">
                  {mode === "marketing" ? "No card needed for the trial. Pay by bank transfer, card or Fawran." : "We confirm and send your invoice within one business day."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Included */}
      <div className="card p-6 sm:p-8">
        <p className="text-sm font-semibold text-ink">Every plan includes</p>
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
        <p className="mt-6 text-xs text-muted">All prices in Qatari Riyal (QAR). No VAT is currently charged in Qatar.</p>
      </div>
    </div>
  );
}
