"use client";
import { useEffect, useRef, useState } from "react";
import { LuInbox } from "react-icons/lu";
import { cn, hueFromString, initials } from "@/lib/utils";

/** Round initials avatar with a stable colour per person. */
export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const hue = hueFromString(name);
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white select-none", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 85% 68%), hsl(${hue + 18} 70% 48%))`,
        boxShadow: `0 4px 12px -4px hsl(${hue} 80% 50% / 0.55)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function EmptyState({
  icon: Icon = LuInbox,
  title,
  message,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500 ring-8 ring-brand-50/50 dark:bg-brand-500/10 dark:ring-brand-500/5">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <p className="font-semibold text-ink">Couldn’t load this page</p>
      <p className="text-sm text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-semibold text-brand-600 hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}

/** Number that counts up smoothly when it first appears or changes. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en") }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(begin + (value - begin) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(display)}</>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small KPI tile */
export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  trend?: number | null;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "card card-hover relative overflow-hidden p-5",
        accent && "border-transparent text-white brand-gradient [&_.stat-muted]:text-white/75",
      )}
    >
      {accent && (
        <div className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <p className={cn("stat-muted text-xs font-semibold tracking-wide text-muted uppercase")}>{label}</p>
        {icon && (
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl",
              accent ? "bg-white/15 text-white" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="relative mt-3 font-display text-[26px] leading-none font-semibold tracking-tight tabular-nums">{value}</p>
      {(hint || trend !== undefined) && (
        <div className="relative mt-2.5 flex items-center gap-2 text-xs">
          {trend !== undefined && trend !== null && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-semibold tabular-nums",
                accent
                  ? "bg-white/20 text-white"
                  : trend >= 0
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
              )}
            >
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
            </span>
          )}
          {hint && <span className="stat-muted text-muted">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/** "Show 50 more" button for long lists (see hooks/use-limit.ts). */
export function ShowMore({ remaining, onClick, step = 50 }: { remaining: number; onClick: () => void; step?: number }) {
  if (remaining <= 0) return null;
  return (
    <div className="flex justify-center border-t border-line p-3">
      <button onClick={onClick} className="rounded-xl px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10">
        Show {Math.min(step, remaining)} more · {remaining} remaining
      </button>
    </div>
  );
}
