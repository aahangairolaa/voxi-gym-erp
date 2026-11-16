"use client";
import { LuCheck } from "react-icons/lu";
import { durationLabel, formatQAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/api";

/** Plan cards you can tap to select. */
export function PlanChooser({ plans, value, onChange }: { plans: Plan[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {plans.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "relative rounded-xl border p-3 text-left transition-all duration-200",
              active
                ? "border-brand-400 bg-brand-50/70 ring-4 ring-[var(--ring)] dark:bg-brand-500/10"
                : "border-line hover:border-brand-200 hover:bg-surface-2/60",
            )}
          >
            <span className="mb-2 block h-1.5 w-8 rounded-full" style={{ background: p.color }} />
            <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
            <p className="text-xs text-muted">{p.sessions ? `${p.sessions} sessions · ` : ""}{durationLabel(p.durationDays)}</p>
            <p className="mt-1.5 text-sm font-bold text-ink tabular-nums">{formatQAR(p.price)}</p>
            {active && (
              <span className="absolute top-2.5 right-2.5 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white">
                <LuCheck className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
