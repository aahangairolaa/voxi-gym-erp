"use client";
import { useState } from "react";
import { LuBuilding2, LuHistory, LuMegaphone, LuTicket, LuTrash2 } from "react-icons/lu";
import { Card, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Entry = { id: string; actor: string; action: string; gymName: string | null; summary: string; createdAt: string };
type Filter = "" | "gym" | "promo" | "notice";

/** What the VOXI team did in the admin panel. */
export default function AdminActivityPage() {
  const [filter, setFilter] = useState<Filter>("");
  const { data, error, loading, reload } = useApi<{ entries: Entry[] }>(`/api/admin/activity${filter ? `?action=${filter}` : ""}`);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const entries = data?.entries ?? [];
  // Group by day
  const days = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = formatDate(e.createdAt);
    days.set(k, [...(days.get(k) ?? []), e]);
  }
  const icon = (a: string) => (a === "gym.delete" ? LuTrash2 : a.startsWith("promo") ? LuTicket : a.startsWith("notice") ? LuMegaphone : LuBuilding2);
  const tone = (a: string) =>
    a === "gym.delete" || a === "gym.suspended" ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : a === "gym.activate" || a === "gym.paid" || a === "gym.create" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15";

  return (
    <>
      <PageHeader title="Admin activity" subtitle="Who on the VOXI team did what: new gyms, activations, suspensions, deletions, promo codes and announcements" />
      <div className="mb-4">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "", label: "Everything" },
            { value: "gym", label: "Gyms" },
            { value: "promo", label: "Promo codes" },
            { value: "notice", label: "Announcements" },
          ]}
        />
      </div>
      <Card>
        {loading && !data && <Skeleton className="m-4 h-40" />}
        {data && entries.length === 0 && <EmptyState icon={LuHistory} title="Nothing yet" message="Changes made in the admin panel are listed here." />}
        {[...days.entries()].map(([day, list]) => (
          <div key={day}>
            <p className="sticky top-0 bg-surface-2/80 px-5 py-2 text-[11px] font-bold tracking-[0.12em] text-muted uppercase backdrop-blur">{day}</p>
            <ul className="divide-y divide-line">
              {list.map((e) => {
                const Icon = icon(e.action);
                return (
                  <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", tone(e.action))}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{e.summary}</p>
                      <p className="text-xs text-muted">by {e.actor}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted tabular-nums">{formatTime(e.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </Card>
    </>
  );
}
