"use client";
import { useState } from "react";
import Link from "next/link";
import { LuCircleCheck, LuCircleX, LuDoorOpen, LuFingerprint, LuLogOut, LuScanFace, LuTimer, LuUsers } from "react-icons/lu";
import { BarChart } from "@/components/charts";
import { useUser } from "@/components/layout/session-context";
import { MemberPicker } from "@/components/members/member-picker";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Input, PageHeader, ShowMore, Skeleton, StatCard, StatusBadge, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useLimit } from "@/hooks/use-limit";
import { api, withQuery } from "@/lib/api-client";
import { toDateInput } from "@/lib/dates";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccessResult, AttendanceResponse, SearchResult } from "@/types/api";

export default function AttendancePage() {
  const user = useUser();
  const toast = useToast();
  const [date, setDate] = useState(toDateInput());
  const [member, setMember] = useState<SearchResult | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<AccessResult | null>(null);
  const [busy, setBusy] = useState(false);
  const isToday = date === toDateInput();
  const { data, loading, reload } = useApi<AttendanceResponse>(withQuery("/api/attendance", { date }), { refreshMs: isToday ? 15_000 : undefined });

  /** Check a member in (or out). `forceId` + override = staff lets a member in without a valid plan. */
  const page = useLimit(data?.visits);

  /** */
  const submit = async (override = false, forceId?: string) => {
    const memberId = forceId ?? member?.id ?? null;
    if (!memberId && !code.trim()) return;
    setBusy(true);
    try {
      const r = await api.post<AccessResult>("/api/attendance", { memberId, code: memberId ? null : code.trim(), override });
      setResult(r);
      if (r.allowed) {
        setMember(null);
        setCode("");
      }
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  const checkout = async (id: string) => {
    await api.post(`/api/attendance/${id}/checkout`);
    toast("success", "Checked out");
    reload();
  };

  const hours = Array.from({ length: 19 }, (_, i) => i + 5);

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle={isToday ? "Live — refreshes every 15 seconds" : formatDate(date)}
        actions={<Input type="date" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} className="w-44" />}
      />

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Check-in desk */}
        <Card className="relative overflow-hidden xl:col-span-2">
          <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
          <CardHeader title="Front desk check-in" subtitle="Scan, type a member code or search by name" icon={<LuScanFace className="h-[18px] w-[18px]" />} />
          <div className="relative space-y-3 px-5 pb-5">
            <MemberPicker value={member} onChange={setMember} />
            {!member && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex gap-2"
              >
                <Input placeholder="…or member code / phone (e.g. 1001)" value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
              </form>
            )}
            <Button size="lg" className="w-full" onClick={() => submit()} loading={busy} disabled={!member && !code.trim()}>
              <LuDoorOpen className="h-5 w-5" /> Check in / out
            </Button>

            {result && (
              <div
                key={result.attendanceId ?? result.member.id + result.action}
                className={cn(
                  "animate-scale-in rounded-2xl border p-4",
                  result.allowed
                    ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : "border-rose-200 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-500/10",
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={result.member.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                      {result.allowed ? (
                        <>
                          <LuCircleCheck className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-700 dark:text-emerald-300">{result.action === "IN" ? "Welcome in" : "Checked out — see you soon"}</span>
                        </>
                      ) : (
                        <>
                          <LuCircleX className="h-4 w-4 text-rose-600" />
                          <span className="text-rose-700 dark:text-rose-300">Access denied</span>
                        </>
                      )}
                    </p>
                    <Link href={`/members/${result.member.id}`} className="mt-0.5 block truncate text-lg font-semibold hover:underline">
                      {result.member.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {result.member.code} · {result.member.plan ?? "No plan"}
                      {result.member.endDate && ` · until ${formatDate(result.member.endDate)}`}
                    </p>
                  </div>
                  <StatusBadge status={result.member.status} />
                </div>
                {result.reason && <p className="mt-3 text-sm font-medium text-ink-soft">{result.reason}</p>}
                {!result.allowed && user.role !== "TRAINER" && (
                  <div className="mt-3 flex gap-2">
                    <Link href={`/members/${result.member.id}`}>
                      <Button size="sm">Renew membership</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => submit(true, result.member.id)}
                    >
                      Let in anyway
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-5 xl:col-span-3">
          <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Check-ins" value={data?.stats.total ?? "–"} icon={<LuUsers className="h-[18px] w-[18px]" />} />
            <StatCard
              label="Inside now"
              value={data?.stats.inside ?? "–"}
              icon={<span className="h-2.5 w-2.5 animate-pulse-ring rounded-full bg-emerald-500" />}
            />
            <StatCard label="Avg. stay" value={data ? `${data.stats.avgMinutes}m` : "–"} icon={<LuTimer className="h-[18px] w-[18px]" />} />
            <StatCard label="Biometric" value={data?.stats.biometric ?? "–"} icon={<LuFingerprint className="h-[18px] w-[18px]" />} />
          </div>
          <Card>
            <CardHeader title="Busy hours" subtitle="Check-ins by hour (Qatar time)" />
            <div className="px-3 pb-3">
              {data ? (
                <BarChart
                  height={180}
                  labels={hours.map((h) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`)}
                  series={[{ name: "Check-ins", color: "#7c5cff", values: hours.map((h) => data.byHour[h] ?? 0) }]}
                />
              ) : (
                <Skeleton className="m-2 h-[170px]" />
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardHeader title={isToday ? "Today’s visits" : `Visits on ${formatDate(date)}`} subtitle={data ? `${data.visits.length} visits` : undefined} />
        {loading && <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>}
        {data && data.visits.length === 0 && <EmptyState icon={LuDoorOpen} title="No check-ins yet" />}
        {data && data.visits.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Branch</th>
                  <th>Source</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.visible.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/members/${v.member.id}`} className="flex items-center gap-3">
                        <Avatar name={v.member.name} size={30} />
                        <span className="font-semibold text-ink hover:text-brand-600">{v.member.name}</span>
                        <span className="font-mono text-[11px] text-muted">{v.member.code}</span>
                      </Link>
                    </td>
                    <td className="tabular-nums">{formatTime(v.checkInAt)}</td>
                    <td className="tabular-nums">
                      {v.checkOutAt ? (
                        <span className="text-ink-soft">
                          {formatTime(v.checkOutAt)}{" "}
                          <span className="text-[11px] text-muted">({Math.round((+new Date(v.checkOutAt) - +new Date(v.checkInAt)) / 60000)}m)</span>
                        </span>
                      ) : (
                        <Badge tone="green" dot>
                          Inside
                        </Badge>
                      )}
                    </td>
                    <td className="text-ink-soft">{v.branch ?? "—"}</td>
                    <td>
                      <Badge tone={v.source === "BIOMETRIC" ? "brand" : "gray"}>{v.source === "BIOMETRIC" ? v.device ?? "Biometric" : "Front desk"}</Badge>
                    </td>
                    <td className="text-right">
                      {!v.checkOutAt && (
                        <Button size="sm" variant="ghost" onClick={() => checkout(v.id)}>
                          <LuLogOut className="h-3.5 w-3.5" /> Out
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ShowMore remaining={page.remaining} onClick={page.more} />
          </div>
        )}
      </Card>
    </>
  );
}
