"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LuBanknote, LuBuilding2, LuCalendarDays, LuClipboardList, LuDoorOpen, LuDownload, LuFingerprint, LuHistory, LuIdCard, LuMessageCircle,
  LuSettings, LuSparkles, LuUserCog, LuUserPlus, LuUsers, LuWallet,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Avatar, Card, EmptyState, ErrorState, PageHeader, Segmented, Select, ShowMore, Skeleton } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useLimit } from "@/hooks/use-limit";
import { withQuery } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/permissions";
import type { ActivityEntry, StaffMember } from "@/types/api";

const AREAS: { value: string; label: string; icon: IconType }[] = [
  { value: "", label: "Everything", icon: LuHistory },
  { value: "payment", label: "Payments", icon: LuBanknote },
  { value: "membership", label: "Memberships", icon: LuIdCard },
  { value: "member", label: "Members", icon: LuUsers },
  { value: "attendance", label: "Access", icon: LuDoorOpen },
  { value: "cash", label: "Cash", icon: LuWallet },
  { value: "whatsapp", label: "WhatsApp", icon: LuMessageCircle },
  { value: "staff", label: "Staff", icon: LuUserCog },
  { value: "settings", label: "Settings", icon: LuSettings },
];
const ICONS: Record<string, IconType> = {
  payment: LuBanknote,
  membership: LuIdCard,
  member: LuUsers,
  attendance: LuDoorOpen,
  cash: LuWallet,
  expense: LuWallet,
  whatsapp: LuMessageCircle,
  staff: LuUserCog,
  settings: LuSettings,
  branch: LuBuilding2,
  plan: LuClipboardList,
  class: LuCalendarDays,
  lead: LuUserPlus,
  device: LuFingerprint,
  report: LuDownload,
};
const LINKS: Record<string, (id: string) => string> = {
  Member: (id) => `/members/${id}`,
  Payment: (id) => `/invoice/${id}`,
};

/** Who did what: sales, refunds, deletes, overrides, settings changes … */
export default function ActivityPage() {
  const [area, setArea] = useState("");
  const [staffId, setStaffId] = useState("");
  const staff = useApi<{ staff: StaffMember[] }>("/api/staff");
  const { data, error, loading, reload } = useApi<{ activity: ActivityEntry[] }>(withQuery("/api/activity", { area, staffId }), { refreshMs: 30_000 });
  const page = useLimit(data?.activity);

  const days = useMemo(() => {
    const groups: { day: string; items: ActivityEntry[] }[] = [];
    for (const a of page.visible) {
      const day = formatDate(a.createdAt);
      const last = groups[groups.length - 1];
      if (last?.day === day) last.items.push(a);
      else groups.push({ day, items: [a] });
    }
    return groups;
  }, [page.visible]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Every sale, refund, delete and override — who did it and when"
        actions={
          <Select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-52">
            <option value="">All staff</option>
            {staff.data?.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        }
      />
      <div className="mb-4">
        <Segmented value={area} onChange={setArea} options={AREAS.map((a) => ({ value: a.value, label: a.label }))} />
      </div>

      <Card>
        {loading && <div className="space-y-3 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>}
        {data && data.activity.length === 0 && <EmptyState icon={LuHistory} title="Nothing recorded yet" message="Actions staff take from now on appear here." />}
        {days.map((g) => (
          <div key={g.day}>
            <p className="sticky top-16 z-[1] border-b border-line bg-surface/95 px-5 py-2 text-xs font-bold tracking-wider text-muted uppercase backdrop-blur">{g.day}</p>
            <ul className="divide-y divide-line/60">
              {g.items.map((a) => {
                const kind = a.action.split(".")[0]!;
                const Icon = ICONS[kind] ?? LuHistory;
                const href = a.entity && a.entityId && LINKS[a.entity] ? LINKS[a.entity]!(a.entityId) : null;
                const danger = /delete|refund|override/.test(a.action);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${danger ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {href ? (
                        <Link href={href} className="text-sm font-medium text-ink hover:text-brand-600">
                          {a.summary}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-ink">{a.summary}</p>
                      )}
                      <p className="flex items-center gap-1.5 text-xs text-muted">
                        {a.staff ? (
                          <>
                            <Avatar name={a.staff.name} size={16} /> {a.staff.name} · {ROLE_LABEL[a.staff.role]}
                          </>
                        ) : (
                          "System"
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-muted tabular-nums">{formatTime(a.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <ShowMore remaining={page.remaining} onClick={page.more} />
      </Card>
    </>
  );
}
