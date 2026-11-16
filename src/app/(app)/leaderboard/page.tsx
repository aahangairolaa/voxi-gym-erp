"use client";
import { useState } from "react";
import Link from "next/link";
import { LuCrown, LuFlame, LuDoorOpen, LuTimer, LuTrophy } from "react-icons/lu";
import { Avatar, Card, EmptyState, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { LeaderboardResponse } from "@/types/api";

const MEDAL = ["from-amber-300 to-amber-500", "from-slate-200 to-slate-400", "from-orange-300 to-orange-600"];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  const { data, loading } = useApi<LeaderboardResponse>(`/api/leaderboard?period=${period}`);
  const entries = data?.entries ?? [];
  const podium = [entries[1], entries[0], entries[2]];

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle={data ? `${data.points.visit} pts per visit · ${data.points.workout} pts per logged workout · ${data.points.per10Min} pt per 10 min trained` : "Who's training hardest"}
        actions={<Segmented value={period} onChange={setPeriod} options={[{ value: "week", label: "This week" }, { value: "month", label: "This month" }, { value: "all", label: "All time" }]} />}
      />

      {loading && <Skeleton className="h-72 rounded-3xl" />}
      {data && entries.length === 0 && (
        <Card>
          <EmptyState icon={LuTrophy} title="No activity yet" message="Check-ins and logged workouts earn points." />
        </Card>
      )}

      {entries.length > 0 && (
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-brand-900/40 bg-[#110b2e] px-4 pt-10 pb-0 text-white sm:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_0%,rgba(124,92,255,0.55),transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[80%] -translate-x-1/2 rounded-full bg-brand-500/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-3xl grid-cols-3 items-end gap-3 sm:gap-6">
            {podium.map((e, i) => {
              if (!e) return <div key={i} />;
              const place = e.rank;
              const h = place === 1 ? "h-36 sm:h-44" : place === 2 ? "h-28 sm:h-32" : "h-20 sm:h-24";
              return (
                <div key={e.memberId} className="flex animate-fade-up flex-col items-center" style={{ animationDelay: `${i * 120}ms` }}>
                  {place === 1 && <LuCrown className="mb-1 h-7 w-7 animate-float text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.7)]" />}
                  <div className={cn("rounded-full bg-gradient-to-br p-[3px]", MEDAL[place - 1])}>
                    <Avatar name={e.member.name} size={place === 1 ? 76 : 60} className="ring-2 ring-[#110b2e]" />
                  </div>
                  <Link href={`/members/${e.member.id}`} className="mt-2 max-w-full truncate text-center text-sm font-semibold hover:underline">
                    {e.member.name}
                  </Link>
                  <p className="text-xs text-white/60 tabular-nums">{e.points.toLocaleString()} pts</p>
                  <div className={cn("mt-3 flex w-full items-start justify-center rounded-t-2xl border border-b-0 border-white/15 bg-gradient-to-b from-white/15 to-white/5 pt-3 backdrop-blur", h)}>
                    <span className="font-display text-3xl font-bold text-white/90">{place}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length > 3 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="table min-w-[560px]">
              <thead>
                <tr>
                  <th className="w-14">#</th>
                  <th>Member</th>
                  <th className="text-right">
                    <LuDoorOpen className="mr-1 inline h-3.5 w-3.5" />Visits
                  </th>
                  <th className="text-right">
                    <LuFlame className="mr-1 inline h-3.5 w-3.5" />Workouts
                  </th>
                  <th className="text-right">
                    <LuTimer className="mr-1 inline h-3.5 w-3.5" />Minutes
                  </th>
                  <th className="text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(3).map((e) => (
                  <tr key={e.memberId}>
                    <td className="font-display font-semibold text-muted tabular-nums">{e.rank}</td>
                    <td>
                      <Link href={`/members/${e.member.id}`} className="flex items-center gap-3 font-semibold hover:text-brand-600">
                        <Avatar name={e.member.name} size={30} /> {e.member.name}
                      </Link>
                    </td>
                    <td className="text-right tabular-nums">{e.visits}</td>
                    <td className="text-right tabular-nums">{e.workouts}</td>
                    <td className="text-right tabular-nums">{e.minutes}</td>
                    <td className="text-right">
                      <span className="rounded-lg bg-brand-50 px-2 py-1 font-semibold text-brand-700 tabular-nums dark:bg-brand-500/15 dark:text-brand-200">{e.points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
