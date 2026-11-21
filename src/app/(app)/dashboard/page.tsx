"use client";
import { useState } from "react";
import Link from "next/link";
import {
  LuArrowUpRight, LuBanknote, LuCalendarDays, LuDoorOpen, LuIdCard, LuScanFace, LuTimer, LuUserPlus, LuUsers,
} from "react-icons/lu";
import { AreaChart, BarChart, Donut } from "@/components/charts";
import { Celebrations } from "@/components/dashboard/celebrations";
import { GetStarted } from "@/components/dashboard/get-started";
import { RenewalReminders } from "@/components/dashboard/renewal-reminders";
import { useUser } from "@/components/layout/session-context";
import { MemberFormModal } from "@/components/members/member-form-modal";
import { SellMembershipModal } from "@/components/members/sell-membership-modal";
import { Avatar, Badge, Button, Card, CardHeader, CountUp, EmptyState, ErrorState, Skeleton, StatCard } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { qatarParts } from "@/lib/dates";
import { formatQAR, formatTime, humanize, timeAgo } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { DashboardData, SearchResult } from "@/types/api";

function greeting() {
  const h = qatarParts(new Date()).hour;
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const user = useUser();
  const { data, error, loading, reload } = useApi<DashboardData>("/api/dashboard", { refreshMs: 60_000 });
  const [newMember, setNewMember] = useState(false);
  const [sell, setSell] = useState<{ open: boolean; member: SearchResult | null }>({ open: false, member: null });
  const canSell = can(user.role, "memberships");
  const canMoney = can(user.role, "payments");

  if (error) return <ErrorState message={error} onRetry={reload} />;

  const k = data?.kpis;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Qatar" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{today}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[30px]">
            {greeting()}, <span className="text-gradient">{user.name.split(" ")[0]}</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/attendance">
            <Button variant="secondary">
              <LuScanFace className="h-4 w-4" /> Check-in
            </Button>
          </Link>
          {canSell && (
            <>
              <Button variant="secondary" onClick={() => setSell({ open: true, member: null })}>
                <LuIdCard className="h-4 w-4" /> Sell plan
              </Button>
              <Button onClick={() => setNewMember(true)}>
                <LuUserPlus className="h-4 w-4" /> New member
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <GetStarted />

      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {loading || !k ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-2xl" />)
        ) : (
          <>
            {canMoney ? (
              <StatCard
                accent
                label="Revenue this month"
                value={<CountUp value={k.revenueThisMonth} format={(n) => formatQAR(n)} />}
                icon={<LuBanknote className="h-[18px] w-[18px]" />}
                trend={k.revenueChange}
                hint="vs same days last month"
              />
            ) : (
              <StatCard accent label="Total members" value={<CountUp value={k.totalMembers} />} icon={<LuUsers className="h-[18px] w-[18px]" />} />
            )}
            <StatCard
              label="Active members"
              value={<CountUp value={k.activeMembers} />}
              icon={<LuUsers className="h-[18px] w-[18px]" />}
              hint={`+${k.newMembers} joined this month`}
            />
            <StatCard
              label="Check-ins today"
              value={<CountUp value={k.todayVisits} />}
              icon={<LuDoorOpen className="h-[18px] w-[18px]" />}
              hint={
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse-ring rounded-full bg-emerald-500" />
                  {k.insideNow} in the gym now
                </span>
              }
            />
            <StatCard
              label="Expiring in 7 days"
              value={<CountUp value={k.expiringSoon} />}
              icon={<LuTimer className="h-[18px] w-[18px]" />}
              hint={`${k.frozenMembers} frozen · ${k.openLeads} open leads`}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RenewalReminders onRenew={(member) => setSell({ open: true, member })} />
        </div>
        <Celebrations />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {canMoney && (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Revenue"
              subtitle="Collected payments, last 6 months"
              action={
                <Link href="/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  Reports <LuArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="px-3 pb-4">
              {data ? <AreaChart data={data.revenueByMonth} height={250} format={formatQAR} /> : <Skeleton className="m-2 h-[240px]" />}
            </div>
          </Card>
        )}
        <Card className={canMoney ? "" : "lg:col-span-1"}>
          <CardHeader title="Active plans" subtitle="What members are on right now" />
          <div className="px-5 pb-5">
            {data ? (
              data.planMix.length ? (
                <Donut data={data.planMix.map((p) => ({ label: p.name, value: p.value, color: p.color }))} centerLabel="Active" />
              ) : (
                <EmptyState title="No active plans yet" />
              )
            ) : (
              <Skeleton className="h-[200px]" />
            )}
          </div>
        </Card>
        {!canMoney && (
          <Card className="lg:col-span-2">
            <CardHeader title="Check-ins" subtitle="Last 14 days" />
            <div className="px-3 pb-4">{data && <BarChart labels={data.visitsByDay.map((d) => d.label)} series={[{ name: "Check-ins", color: "#7c5cff", values: data.visitsByDay.map((d) => d.value) }]} />}</div>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {canMoney && (
          <Card className="lg:col-span-2">
            <CardHeader title="Check-ins" subtitle="Last 14 days" />
            <div className="px-3 pb-4">
              {data ? (
                <BarChart
                  labels={data.visitsByDay.map((d) => d.label)}
                  series={[{ name: "Check-ins", color: "#7c5cff", values: data.visitsByDay.map((d) => d.value) }]}
                  height={330}
                />
              ) : (
                <Skeleton className="m-2 h-[220px]" />
              )}
            </div>
          </Card>
        )}
        <Card>
          <CardHeader
            title="Today’s classes"
            icon={<LuCalendarDays className="h-[18px] w-[18px]" />}
            action={
              <Link href="/classes" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Schedule
              </Link>
            }
          />
          <ul className="space-y-1 px-3 pb-4">
            {data?.classesToday.length === 0 && <EmptyState title="No classes today" />}
            {data?.classesToday.map((c) => {
              const pct = Math.round((c.booked / c.capacity) * 100);
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2/60">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-sm font-semibold text-ink tabular-nums">{formatTime(c.startsAt).replace(" ", "")}</p>
                    <p className="text-[10px] text-muted">{c.durationMin} min</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-xs text-muted">{c.trainer ?? "—"} · {c.room}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-muted tabular-nums">
                    {c.booked}/{c.capacity}
                  </span>
                </li>
              );
            })}
            {!data && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="mx-2 my-2 h-12" />)}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {canMoney && (
          <Card>
            <CardHeader
              title="Latest payments"
              icon={<LuBanknote className="h-[18px] w-[18px]" />}
              action={
                <Link href="/payments" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  View all
                </Link>
              }
            />
            <ul className="divide-y divide-line/70 px-2 pb-2">
              {data?.recentPayments.length === 0 && <EmptyState title="No payments yet" />}
              {data?.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                    <LuBanknote className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{p.member?.name ?? "Walk-in"}</p>
                    <p className="truncate text-xs text-muted">
                      {p.description ?? p.invoiceNo} · {humanize(p.method)} · {timeAgo(p.paidAt)}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${p.status === "REFUNDED" ? "text-rose-500 line-through" : "text-ink"}`}>
                    {formatQAR(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card className={canMoney ? "" : "lg:col-span-2"}>
          <CardHeader
            title="Latest check-ins"
            icon={<LuDoorOpen className="h-[18px] w-[18px]" />}
            action={
              <Link href="/attendance" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Attendance
              </Link>
            }
          />
          <ul className="divide-y divide-line/70 px-2 pb-2">
            {data?.recentVisits.length === 0 && <EmptyState title="No check-ins yet today" />}
            {data?.recentVisits.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-3 py-3">
                <Avatar name={v.member.name} src={v.member.photoUrl} size={34} />
                <Link href={`/members/${v.member.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-ink hover:text-brand-600">
                  {v.member.name}
                </Link>
                <Badge tone={v.source === "BIOMETRIC" ? "brand" : v.source === "QR" ? "blue" : "gray"}>{humanize(v.source)}</Badge>
                <span className="w-16 text-right text-xs text-muted tabular-nums">{formatTime(v.checkInAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <MemberFormModal open={newMember} onClose={() => setNewMember(false)} onSaved={() => reload()} />
      <SellMembershipModal open={sell.open} member={sell.member} onClose={() => setSell({ open: false, member: null })} onDone={reload} />
    </div>
  );
}
