"use client";
import { useState } from "react";
import { LuDownload, LuTrendingUp, LuWallet, LuUsers, LuDoorOpen } from "react-icons/lu";
import { BarChart, BarsList, Donut, Heatmap } from "@/components/charts";
import { Card, CardHeader, ErrorState, Input, PageHeader, Segmented, Skeleton, StatCard } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { withQuery } from "@/lib/api-client";
import { addMonths, startOfMonth, toDateInput } from "@/lib/dates";
import { formatNumber, formatQAR, humanize } from "@/lib/format";
import type { ReportData } from "@/types/api";

type Preset = "month" | "3m" | "6m" | "12m" | "custom";

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>("6m");
  const [from, setFrom] = useState(toDateInput(startOfMonth(addMonths(new Date(), -5))));
  const [to, setTo] = useState(toDateInput());
  const { data, error, reload } = useApi<ReportData>(withQuery("/api/reports", { from, to }));

  const pick = (p: Preset) => {
    setPreset(p);
    if (p === "custom") return;
    const back = { month: 0, "3m": 2, "6m": 5, "12m": 11 }[p];
    setFrom(toDateInput(startOfMonth(addMonths(new Date(), -back))));
    setTo(toDateInput());
  };

  const exportUrl = (type: string) => withQuery("/api/reports/export", { type, from, to });
  const t = data?.totals;
  const margin = t && t.revenue ? Math.round((t.net / t.revenue) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Revenue, costs, growth and busy hours"
        actions={
          <>
            <Segmented
              value={preset}
              onChange={pick}
              options={[
                { value: "month", label: "This month" },
                { value: "3m", label: "3M" },
                { value: "6m", label: "6M" },
                { value: "12m", label: "12M" },
                { value: "custom", label: "Custom" },
              ]}
            />
            {preset === "custom" && (
              <>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
              </>
            )}
          </>
        }
      />
      {error && <ErrorState message={error} onRetry={reload} />}

      <div className="stagger mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard accent label="Revenue" value={t ? formatQAR(t.revenue) : "–"} icon={<LuTrendingUp className="h-[18px] w-[18px]" />} hint={t ? `${t.membershipsSold} memberships sold` : undefined} />
        <StatCard label="Expenses" value={t ? formatQAR(t.expenses) : "–"} icon={<LuWallet className="h-[18px] w-[18px]" />} />
        <StatCard
          label="Net profit"
          value={t ? <span className={t.net < 0 ? "text-rose-600" : ""}>{formatQAR(t.net)}</span> : "–"}
          hint={t ? `${margin}% margin` : undefined}
        />
        <StatCard label="New members" value={t ? formatNumber(t.newMembers) : "–"} icon={<LuUsers className="h-[18px] w-[18px]" />} hint={t ? `${formatNumber(t.visits)} visits · ${t.uniqueVisitors} unique` : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue vs expenses"
            subtitle="Per month, QAR"
            action={
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#7c5cff]" />Revenue</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d6cbff]" />Expenses</span>
              </div>
            }
          />
          <div className="px-3 pb-4">
            {data ? (
              <BarChart
                height={260}
                labels={data.months.map((m) => m.label)}
                format={formatQAR}
                series={[
                  { name: "Revenue", color: "#7c5cff", values: data.months.map((m) => m.revenue) },
                  { name: "Expenses", color: "#d6cbff", values: data.months.map((m) => m.expenses) },
                ]}
              />
            ) : (
              <Skeleton className="m-2 h-[250px]" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Payment methods" />
          <div className="px-5 pb-5">{data ? <BarsList data={data.byMethod.map((m) => ({ label: humanize(m.label), value: m.value }))} format={formatQAR} /> : <Skeleton className="h-48" />}</div>
        </Card>

        <Card>
          <CardHeader title="Memberships sold" subtitle="By plan, in this period" />
          <div className="px-5 pb-5">{data ? <Donut data={data.planSales} centerLabel="Sold" /> : <Skeleton className="h-48" />}</div>
        </Card>
        <Card>
          <CardHeader title="Revenue by plan" />
          <div className="px-5 pb-5">{data ? <BarsList data={data.byPlan.slice(0, 8)} format={formatQAR} /> : <Skeleton className="h-48" />}</div>
        </Card>
        <Card>
          <CardHeader title="Expenses by category" />
          <div className="px-5 pb-5">
            {data ? <BarsList data={data.byCategory} format={formatQAR} color="linear-gradient(90deg,#fda4af,#e11d48)" /> : <Skeleton className="h-48" />}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Busy hours" subtitle="When members check in (Qatar time)" icon={<LuDoorOpen className="h-[18px] w-[18px]" />} />
          <div className="px-5 pb-5">{data ? <Heatmap grid={data.heatmap} /> : <Skeleton className="h-56" />}</div>
        </Card>
        <Card>
          <CardHeader title="Export to Excel" subtitle="CSV files for this date range" icon={<LuDownload className="h-[18px] w-[18px]" />} />
          <div className="grid gap-2 px-5 pb-5">
            {[
              ["payments", "Payments & invoices"],
              ["expenses", "Expenses"],
              ["attendance", "Attendance log"],
              ["members", "All members"],
            ].map(([type, label]) => (
              <a
                key={type}
                href={exportUrl(type!)}
                download
                className="flex h-10 items-center justify-between rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:border-brand-300 hover:bg-surface-2"
              >
                {label} <LuDownload className="h-4 w-4 text-muted" />
              </a>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
