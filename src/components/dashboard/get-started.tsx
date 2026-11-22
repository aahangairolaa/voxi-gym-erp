"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LuArrowRight, LuCircleCheck, LuCircle, LuRocket, LuX } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { Card } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Onboarding = { steps: { key: string; title: string; hint: string; href: string; done: boolean }[]; done: number; total: number; dismissed: boolean };

/** "Get started" checklist for new gyms (owners & managers), until finished or hidden. */
export function GetStarted() {
  const user = useUser();
  const allowed = user.role === "OWNER" || user.role === "MANAGER";
  const { data, reload } = useApi<Onboarding>(allowed ? "/api/onboarding" : null);
  const [welcome, setWelcome] = useState(false);
  useEffect(() => setWelcome(new URLSearchParams(window.location.search).get("welcome") === "1"), []);

  if (!allowed || !data || data.dismissed || data.done === data.total) return null;
  const pct = Math.round((data.done / data.total) * 100);

  const hide = async () => {
    await api.del("/api/onboarding").catch(() => {});
    reload();
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-10 h-60 w-60 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white brand-gradient">
            <LuRocket className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-ink">{welcome ? `Welcome to VOXI, ${user.name.split(" ")[0]}` : "Get your gym set up"}</p>
            <p className="text-sm text-muted">
              {data.done} of {data.total} done. Most gyms finish in about 15 minutes.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full brand-gradient transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button onClick={hide} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Hide checklist" title="Hide checklist">
            <LuX className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.steps.map((s) => (
            <li key={s.key}>
              <Link
                href={s.href}
                className={cn(
                  "group flex h-full items-start gap-3 rounded-2xl border px-4 py-3 transition",
                  s.done ? "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5" : "border-line hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-500/5",
                )}
              >
                {s.done ? <LuCircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <LuCircle className="mt-0.5 h-5 w-5 shrink-0 text-line-strong" />}
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold", s.done ? "text-ink-soft line-through decoration-emerald-500/50" : "text-ink")}>{s.title}</span>
                  <span className="block text-xs text-muted">{s.hint}</span>
                </span>
                {!s.done && <LuArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
