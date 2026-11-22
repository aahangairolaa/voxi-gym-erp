"use client";
import Link from "next/link";
import { useState } from "react";
import { LuCheck, LuCoffee, LuFingerprint, LuMapPin, LuMinus, LuPlus, LuSparkles, LuTicket, LuUpload, LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
import {
  BRANCH_DISCOUNTS, DEFAULT_TERM, ENTRANCE_DISCOUNTS, ENTRANCE_PRICE, INCLUDED, MAX_ENTRANCES, MAX_EXTRA_BRANCHES, ONE_TIME_ADDONS, TERMS, TRIAL_DAYS,
  CAFE_PRICE_YEAR, MAX_CAFE_ITEMS, branchListPrice, branchPrice, cafePrice, checkout, entranceDiscount, entrancePrice, quote, type Promo, type Quote,
} from "@/lib/pricing";

const fmt = (n: number) => n.toLocaleString("en");

export type PlanChoice = { quote: Quote; entrances: number; onboarding: boolean; oneTime: number; promoCode: string | null; totalToday: number; cafe: boolean };

/** "QAR 12,000" struck through, next to the price after discount. */
function Was({ list, net, className }: { list: number; net: number; className?: string }) {
  if (list <= net) return null;
  return <s className={cn("mr-1.5 font-normal opacity-55 decoration-1", className)}>{fmt(list)}</s>;
}

type Props = {
  /** "marketing" ends with a free-trial button; "billing" calls onChoose with the selection. */
  mode?: "marketing" | "billing";
  initialMonths?: number;
  initialBranches?: number;
  /** Start with the VOXI Café add-on chosen (e.g. it's already on, or they came from the café preview). */
  initialCafe?: boolean;
  onChoose?: (c: PlanChoice) => void;
  busy?: boolean;
  chooseLabel?: string;
  /** Billing only: checks a promo code with VOXI. Shows the promo code box when given. */
  onCheckPromo?: (code: string, months: number) => Promise<Promo>;
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
export function PricingTable({ mode = "marketing", initialMonths = DEFAULT_TERM, initialBranches = 0, initialCafe = false, onChoose, busy, chooseLabel, onCheckPromo }: Props) {
  const [months, setMonths] = useState<number>(TERMS.some((t) => t.months === initialMonths) ? initialMonths : DEFAULT_TERM);
  const [branches, setBranches] = useState(Math.min(initialBranches, MAX_EXTRA_BRANCHES));
  const [entrances, setEntrances] = useState(0);
  const [onboarding, setOnboarding] = useState(false);
  const [cafe, setCafe] = useState(initialCafe);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const c = checkout(months, branches, entrances, onboarding, promo, cafe);
  const q = c.quote;
  const one = c.oneTime;
  const annual = months === 12;
  const promoNeedsLonger = !!promo && !c.promo; // code kept, but this term is too short for it
  const nextEntrance = entrances < MAX_ENTRANCES ? entrances + 1 : null;

  const applyPromo = async () => {
    if (!onCheckPromo || !promoInput.trim()) return;
    setChecking(true);
    setPromoError(null);
    try {
      const p = await onCheckPromo(promoInput, months);
      setPromo(p);
      setPromoInput("");
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "That code couldn't be applied.");
    } finally {
      setChecking(false);
    }
  };

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
                  <p className="mt-0.5 text-sm text-muted">Your main location is included. Run up to 5 in total: the 2nd added branch is 20% off, and every one after costs even less.</p>
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
                    <span className={cn("tabular-nums", on ? "font-semibold text-ink" : "text-muted")}>
                      QAR <Was list={branchListPrice(months)} net={branchPrice(i + 1, months)} />
                      {fmt(branchPrice(i + 1, months))}
                    </span>
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
                <Stepper value={entrances} max={MAX_ENTRANCES} onChange={setEntrances} label="entrances" />
              </div>
              <p className="mt-4 font-semibold text-ink">{ONE_TIME_ADDONS[0].name}</p>
              <p className="mt-0.5 text-sm text-muted">{ONE_TIME_ADDONS[0].note}</p>
              <p className="mt-3 text-sm font-semibold text-ink tabular-nums">
                QAR {fmt(ENTRANCE_PRICE)} <span className="font-normal text-muted">per entrance, one-time</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Each extra entrance gets more off, up to {Math.round(ENTRANCE_DISCOUNTS[ENTRANCE_DISCOUNTS.length - 1] * 100)}%.
              </p>
              {entrances > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {one.entrances.map((e) => (
                    <span key={e.n} className="rounded-lg border border-brand-300 bg-brand-50/70 px-2 py-1 text-[11px] font-medium text-ink tabular-nums dark:border-brand-500/40 dark:bg-brand-500/10">
                      #{e.n} <Was list={e.listPrice} net={e.price} className="mr-1" />
                      {fmt(e.price)}
                    </span>
                  ))}
                </div>
              )}
              {nextEntrance && entrances > 0 && (
                <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Next entrance: QAR {fmt(entrancePrice(nextEntrance))} ({Math.round(entranceDiscount(nextEntrance) * 100)}% off)
                </p>
              )}
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
        {/* VOXI Café */}
        <button
          type="button"
          onClick={() => setCafe((v) => !v)}
          aria-pressed={cafe}
          className={cn(
            "card relative mt-4 flex w-full flex-col gap-5 overflow-hidden p-6 text-left transition sm:flex-row sm:items-center",
            cafe ? "border-brand-400 dark:border-brand-500/50" : "hover:border-brand-300",
          )}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white brand-gradient shadow-[0_8px_20px_-8px_rgba(106,68,242,0.8)]">
            <LuCoffee className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">VOXI Café</span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">For gyms with a café</span>
            </span>
            <span className="mt-0.5 block text-sm text-muted">
              Run your in-house café from VOXI: a menu of up to {MAX_CAFE_ITEMS} items, counter sales by cash or card, stock counts, best sellers and your café team.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-4">
            <span className="text-right">
              <span className="block text-sm font-semibold text-ink tabular-nums">QAR {fmt(cafePrice(months))}</span>
              <span className="block text-xs text-muted">{months === 12 ? "per year" : `for ${q.termLabel} (QAR ${fmt(CAFE_PRICE_YEAR)} a year)`}</span>
            </span>
            <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", cafe ? "bg-brand-600" : "bg-line-strong")}>
              <span className={cn("absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300", cafe && "translate-x-5")} />
            </span>
          </span>
        </button>
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
                  <dd className="tabular-nums">
                    QAR <Was list={b.listPrice} net={b.price} />
                    {fmt(b.price)}
                  </dd>
                </div>
              ))}
              {entrances > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-white/70">
                    Biometric entrance × {one.entrances.length} <span className="text-white/45">one-time</span>
                    {one.biometricList > one.biometric && <span className="ml-1.5 text-emerald-300">multi-entrance discount</span>}
                  </dt>
                  <dd className="tabular-nums">
                    QAR <Was list={one.biometricList} net={one.biometric} />
                    {fmt(one.biometric)}
                  </dd>
                </div>
              )}
              {q.cafe > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-white/70">VOXI Café, {q.termLabel}</dt>
                  <dd className="tabular-nums">QAR {fmt(q.cafe)}</dd>
                </div>
              )}
              {(onboarding || annual) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-white/70">Onboarding and migration <span className="text-white/45">one-time</span></dt>
                  <dd className="tabular-nums">
                    {annual ? (
                      <>
                        <Was list={ONE_TIME_ADDONS[1].price} net={0} />
                        <span className="text-emerald-300">Free</span>
                      </>
                    ) : (
                      `QAR ${fmt(one.onboarding)}`
                    )}
                  </dd>
                </div>
              )}
              {(c.volumeDiscount > 0 || c.promoDiscount > 0) && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex justify-between gap-3 text-white/55">
                    <dt>Full price</dt>
                    <dd className="tabular-nums">QAR {fmt(c.listTotal)}</dd>
                  </div>
                  {c.volumeDiscount > 0 && (
                    <div className="flex justify-between gap-3 text-emerald-300">
                      <dt>Bundle discounts</dt>
                      <dd className="tabular-nums">− QAR {fmt(c.volumeDiscount)}</dd>
                    </div>
                  )}
                  {c.promoDiscount > 0 && c.promo && (
                    <div className="flex justify-between gap-3 text-emerald-300">
                      <dt>
                        Promo {c.promo.code} <span className="text-emerald-300/70">({c.promo.label})</span>
                      </dt>
                      <dd className="tabular-nums">− QAR {fmt(c.promoDiscount)}</dd>
                    </div>
                  )}
                </div>
              )}
              {q.saving > 0 && (
                <div className="flex justify-between gap-3 border-t border-white/10 pt-3 text-emerald-300">
                  <dt>You save vs quarterly billing</dt>
                  <dd className="tabular-nums">QAR {fmt(q.saving)}</dd>
                </div>
              )}
            </dl>
            {onCheckPromo && (
              <div className="lg:col-start-1">
                {promo ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
                      <LuTicket className="h-4 w-4" /> {promo.code}
                      <span className="font-normal text-emerald-200/75">{promo.label}</span>
                      <button type="button" onClick={() => setPromo(null)} aria-label="Remove promo code" className="ml-1 rounded-md p-0.5 text-emerald-200/70 hover:bg-white/10 hover:text-white">
                        <LuX className="h-3.5 w-3.5" />
                      </button>
                    </span>
                    {promoNeedsLonger && (
                      <span className="text-xs text-amber-300">This code needs the {promo.minMonths === 12 ? "Annual" : `${promo.minMonths}-month`} plan or longer.</span>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void applyPromo();
                    }}
                  >
                    <label htmlFor="promo" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60">
                      Promo code
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LuTicket className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
                        <input
                          id="promo"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value.toUpperCase().replace(/\s/g, ""));
                            setPromoError(null);
                          }}
                          placeholder="Enter code"
                          maxLength={30}
                          autoComplete="off"
                          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pr-3 pl-9 text-sm font-semibold tracking-wider text-white uppercase outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-white/35 placeholder:normal-case focus:border-white/40"
                        />
                      </div>
                      <button type="submit" disabled={checking || !promoInput.trim()} className="h-11 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40">
                        {checking ? "Checking..." : "Apply"}
                      </button>
                    </div>
                    {promoError && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-300">{promoError}</p>}
                  </form>
                )}
              </div>
            )}

            <div className="flex flex-col justify-between gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-white/10 lg:pl-10">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">Total today</p>
                {c.listTotal > c.totalToday && (
                  <p className="mt-2 text-sm text-white/45 tabular-nums">
                    <s>QAR {fmt(c.listTotal)}</s>
                    <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 no-underline">
                      You save QAR {fmt(c.listTotal - c.totalToday)}
                    </span>
                  </p>
                )}
                <p className="mt-1 flex items-end gap-1.5">
                  <span className="mb-1.5 text-sm font-semibold text-white/70">QAR</span>
                  <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">{fmt(c.totalToday)}</span>
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Then QAR {fmt(c.renewal)} every {q.termLabel}
                  {q.months > 1 && <> · QAR {fmt(q.perMonth)} per month</>}
                </p>
                {c.promoDiscount > 0 && <p className="mt-1 text-xs text-white/45">The promo code applies to your first invoice.</p>}
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
                    onClick={() =>
                      onChoose?.({ quote: q, entrances: one.entrances.length, onboarding: onboarding && !annual, oneTime: one.total, promoCode: c.promo?.code ?? null, totalToday: c.totalToday, cafe })
                    }
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
