import { startOfMonth, startOfWeek } from "@/lib/dates";
import { db } from "../db";
import { fullName, memberPhotoUrl } from "./_shared";

/**
 * Points formula (easy to change):
 *   every gym visit      = 10 pts
 *   every logged workout = 15 pts
 *   every 10 minutes trained = 1 pt
 */
export const POINTS = { visit: 10, workout: 15, per10Min: 1 };

export async function getLeaderboard(gymId: string, period: "week" | "month" | "all" = "month") {
  const from = period === "week" ? startOfWeek() : period === "month" ? startOfMonth() : new Date(0);

  const [visits, logs] = await Promise.all([
    db.attendance.groupBy({ by: ["memberId"], where: { gymId, checkInAt: { gte: from } }, _count: { _all: true } }),
    db.workoutLog.groupBy({
      by: ["memberId"],
      where: { gymId, loggedAt: { gte: from } },
      _count: { _all: true },
      _sum: { durationMin: true },
    }),
  ]);

  const score = new Map<string, { visits: number; workouts: number; minutes: number }>();
  for (const v of visits) score.set(v.memberId, { visits: v._count._all, workouts: 0, minutes: 0 });
  for (const l of logs) {
    const s = score.get(l.memberId) ?? { visits: 0, workouts: 0, minutes: 0 };
    s.workouts = l._count._all;
    s.minutes = l._sum.durationMin ?? 0;
    score.set(l.memberId, s);
  }

  const ranked = [...score.entries()]
    .map(([memberId, s]) => ({
      memberId,
      ...s,
      points: s.visits * POINTS.visit + s.workouts * POINTS.workout + Math.floor(s.minutes / 10) * POINTS.per10Min,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 50);

  const members = await db.member.findMany({
    where: { gymId, id: { in: ranked.map((r) => r.memberId) } },
    select: { id: true, code: true, firstName: true, lastName: true, gender: true, photoUpdatedAt: true },
  });
  const byId = new Map(members.map((m) => [m.id, m]));

  return {
    period,
    points: POINTS,
    entries: ranked
      .filter((r) => byId.has(r.memberId))
      .map((r, i) => {
        const m = byId.get(r.memberId)!;
        return { rank: i + 1, member: { id: m.id, code: m.code, name: fullName(m), gender: m.gender, photoUrl: memberPhotoUrl(m) }, ...r };
      }),
  };
}
