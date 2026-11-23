"use client";
import { useState } from "react";
import Link from "next/link";
import { LuArrowUpRight, LuTrendingDown, LuTrendingUp } from "react-icons/lu";
import { AreaChart, BarChart } from "@/components/charts";
import { Card, CardHeader, Segmented, Skeleton } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { formatQAR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "day" | "month" | "year";
type Timeline = { buckets: { label: string; value: number }[]; total: number; current: number; previous: number; change: number | null };

const COPY: Record<Period, { subtitle: string; current: string; previous: string }> = {
  day: { subtitle: "Daily sales, last 30 days (memberships, PT, extras and café)", current: "Today", previous: "yesterday" },
  month: { subtitle: "Monthly sales, last 12 months", current: "This month", previous: "last month" },
  year: { subtitle: "Yearly sales, last 5 years", current: "This year", previous: "last year" },
};

/** Revenue chart for the dashboard, with a Day / Month / Year switch. */
export function RevenueTimeline({ className }: { className?: string }) {
  const [period, setPeriod] = useState<Period>("day");
  const { data } = useApi<Timeline>(`/api/dashboard/revenue?period=${period}`);
  const c = COPY[period];
  const up = (data?.change ?? 0) >= 0;

  return (
    <Card className={className}>
      <CardHeader
        title="Revenue"
        subtitle={c.subtitle}
        action={
          <div className="flex items-center gap-3">
            <Segmented
              value={period}
              onChange={setPeriod}
              options={[
                { value: "day" as const, label: "Day" },
                { value: "month" as const, label: "Month" },
                { value: "year" as const, label: "Year" },
              ]}
            />
            <Link href={`/sales?period=${period}`} className="hidden items-center gap-1 text-xs font-semibold text-brand-600 hover:underline sm:inline-flex dark:text-brand-300">
              Sales <LuArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />
      <div className="flex flex-wrap items-end gap-x-6 gap-y-1 px-5 pb-2">
        <div>
          <p className="text-xs text-muted">{c.current}</p>
          <p className="font-display text-2xl font-semibold tracking-tight text-ink tabular-nums">{data ? formatQAR(data.current) : "–"}</p>
        </div>
        {data && data.change !== null && (
          <p className={cn("mb-1 inline-flex items-center gap-1 text-xs font-semibold", up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {up ? <LuTrendingUp className="h-3.5 w-3.5" /> : <LuTrendingDown className="h-3.5 w-3.5" />}
            {up ? "+" : ""}
            {data.change}% vs {c.previous}
          </p>
        )}
        {data && (
          <p className="mb-1 ml-auto text-xs text-muted">
            Total shown: <span className="font-semibold text-ink tabular-nums">{formatQAR(data.total)}</span>
          </p>
        )}
      </div>
      <div className="px-3 pb-4">
        {!data ? (
          <Skeleton className="m-2 h-[240px]" />
        ) : period === "day" ? (
          <BarChart labels={data.buckets.map((b) => b.label)} series={[{ name: "Sales", color: "#7c5cff", values: data.buckets.map((b) => b.value) }]} format={formatQAR} />
        ) : (
          <AreaChart data={data.buckets} height={250} format={formatQAR} />
        )}
      </div>
    </Card>
  );
}
