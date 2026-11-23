"use client";
import Link from "next/link";
import { useState } from "react";
import { LuActivity, LuArrowRight, LuBell, LuBuilding2, LuCalendarPlus, LuPlus, LuReceipt, LuScanFace, LuTrendingUp, LuUsers } from "react-icons/lu";
import { CreateGymModal, GymMark, STATUS_LABEL, STATUS_TONE, useAdminData } from "@/components/admin/gym-admin";
import { GrowthCard, NeedsAttention, daysUntil } from "@/components/admin/platform-tools";
import { Badge, Button, Card, CardHeader, ErrorState, PageHeader, StatCard } from "@/components/ui";
import { formatDate, formatQAR, timeAgo } from "@/lib/format";

/** VOXI admin dashboard: the whole platform at a glance. */
export default function AdminDashboard() {
  const { gyms, setEditing, manage, reload } = useAdminData();
  const [creating, setCreating] = useState(false);
  const d = gyms.data;
  if (gyms.error) return <ErrorState message={gyms.error} onRetry={gyms.reload} />;
  const all = d?.gyms ?? [];
  const recent = [...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5);
  const trials = all
    .filter((g) => g.status === "TRIAL" && g.trialEndsAt)
    .sort((a, b) => +new Date(a.trialEndsAt!) - +new Date(b.trialEndsAt!))
    .slice(0, 5);
  const top = [...all].filter((g) => g.status !== "SUSPENDED").sort((a, b) => b.members - a.members).slice(0, 5);

  const List = ({ title, sub, rows, right, href }: { title: string; sub: string; rows: typeof all; right: (g: (typeof all)[number]) => React.ReactNode; href: string }) => (
    <Card>
      <CardHeader
        title={title}
        subtitle={sub}
        action={
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
            See all <LuArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((g) => (
            <li key={g.id}>
              <button onClick={() => setEditing(g)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
                <GymMark g={g} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{g.name}</span>
                  <span className="block truncate text-xs text-muted">{g.owner?.name ?? "No owner"}</span>
                </span>
                <span className="shrink-0 text-right text-xs">{right(g)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="VOXI at a glance: revenue, gyms and what needs you today"
        actions={
          <Button onClick={() => setCreating(true)}>
            <LuPlus className="h-4 w-4" /> New gym
          </Button>
        }
      />

      <div className="stagger mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard accent label="Monthly recurring revenue" value={d ? formatQAR(d.stats.mrr) : "–"} icon={<LuTrendingUp className="h-[18px] w-[18px]" />} hint={d ? `${formatQAR(d.stats.mrr * 12)} a year` : undefined} />
        <StatCard label="Paying gyms" value={d?.stats.active ?? "–"} icon={<LuBuilding2 className="h-[18px] w-[18px]" />} hint={d ? `${d.stats.trial} on trial · ${d.stats.suspended} suspended` : undefined} />
        <StatCard label="Members across all gyms" value={d?.stats.members.toLocaleString("en") ?? "–"} icon={<LuUsers className="h-[18px] w-[18px]" />} />
        <StatCard label="Plan requests" value={d?.stats.requests ?? "–"} icon={<LuBell className="h-[18px] w-[18px]" />} hint={d?.stats.requests ? "Waiting for you" : "None waiting"} />
      </div>
      <div className="stagger mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="New gyms this month" value={d?.stats.newThisMonth ?? "–"} icon={<LuCalendarPlus className="h-[18px] w-[18px]" />} />
        <StatCard label="Check-ins today" value={d?.stats.checkinsToday.toLocaleString("en") ?? "–"} icon={<LuScanFace className="h-[18px] w-[18px]" />} hint={d ? `${d.stats.checkinsWeek.toLocaleString("en")} in the last 7 days` : undefined} />
        <StatCard label="Taken by gyms (30 days)" value={d ? formatQAR(d.stats.processed30d) : "–"} icon={<LuReceipt className="h-[18px] w-[18px]" />} hint="Payments recorded in VOXI" />
        <StatCard
          label="Active this week"
          value={d ? all.filter((g) => g.lastActiveAt && Date.now() - +new Date(g.lastActiveAt) < 7 * 86_400_000).length : "–"}
          icon={<LuActivity className="h-[18px] w-[18px]" />}
          hint="Gyms whose staff signed in"
        />
      </div>

      {d && (
        <div className="mb-5 grid items-start gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <NeedsAttention gyms={all} onOpen={setEditing} onChanged={reload} />
          </div>
          <GrowthCard gyms={all} />
        </div>
      )}

      {d && (
        <div className="grid items-start gap-5 lg:grid-cols-3">
          <List title="Newest gyms" sub="The latest sign-ups" rows={recent} href="/admin/gyms" right={(g) => (
            <>
              <Badge tone={STATUS_TONE[g.status]}>{STATUS_LABEL[g.status]}</Badge>
              <span className="mt-1 block text-muted">{timeAgo(g.createdAt)}</span>
            </>
          )} />
          <List title="Trials ending" sub="Soonest first" rows={trials} href="/admin/gyms" right={(g) => {
            const t = daysUntil(g.trialEndsAt) ?? 0;
            return <span className={t <= 3 ? "font-semibold text-rose-600" : "text-muted"}>{t < 0 ? "ended" : t === 0 ? "today" : `${t} day${t === 1 ? "" : "s"}`}<span className="block font-normal text-muted">{formatDate(g.trialEndsAt!)}</span></span>;
          }} />
          <List title="Biggest gyms" sub="By members" rows={top} href="/admin/gyms" right={(g) => (
            <span className="font-semibold text-ink tabular-nums">
              {g.members.toLocaleString("en")}
              <span className="block font-normal text-muted">members</span>
            </span>
          )} />
        </div>
      )}

      <CreateGymModal open={creating} onClose={() => setCreating(false)} onDone={reload} />
      {manage}
    </>
  );
}
