/**
 * Member engagement for the dashboard:
 *  - Renewal reminders: who is about to expire / recently expired, and when we last reminded them
 *  - Celebrations: birthdays this week and visit milestones (10th, 25th, 50th … visit)
 */
import type { MessageType } from "@prisma/client";
import { addDays, qatarParts, startOfDay } from "@/lib/dates";
import { db } from "../db";
import { daysLeft, fullName, getWarnDays, memberPhotoUrl } from "./_shared";

const EXPIRED_LOOKBACK_DAYS = 14;
export const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

async function lastMessages(gymId: string, memberIds: string[], types: MessageType[], since?: Date) {
  if (!memberIds.length) return new Map<string, Date>();
  const rows = await db.whatsAppMessage.groupBy({
    by: ["memberId"],
    where: { gymId, memberId: { in: memberIds }, type: { in: types }, status: { not: "FAILED" }, ...(since ? { createdAt: { gte: since } } : {}) },
    _max: { createdAt: true },
  });
  return new Map(rows.filter((r) => r.memberId && r._max.createdAt).map((r) => [r.memberId!, r._max.createdAt!]));
}

export async function getReminders(gymId: string) {
  const today = startOfDay();
  const warnDays = await getWarnDays(gymId);
  const windowEnd = addDays(today, warnDays + 1);
  const lookback = addDays(today, -EXPIRED_LOOKBACK_DAYS);

  // Each member's latest (non-cancelled) membership that ended recently or ends soon
  const rows = await db.membership.findMany({
    where: { gymId, status: { not: "CANCELLED" }, endDate: { gte: lookback } },
    orderBy: { endDate: "desc" },
    select: {
      memberId: true,
      status: true,
      endDate: true,
      plan: { select: { name: true } },
      member: { select: { id: true, code: true, firstName: true, lastName: true, phone: true, photoUpdatedAt: true } },
    },
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.memberId)) latest.set(r.memberId, r); // ordered desc → first is latest

  const expiring: (typeof rows)[number][] = [];
  const expired: (typeof rows)[number][] = [];
  for (const r of latest.values()) {
    if (r.status === "FROZEN") continue;
    if (r.endDate >= today && r.endDate < windowEnd) expiring.push(r);
    else if (r.endDate < today) expired.push(r);
  }

  const ids = [...expiring, ...expired].map((r) => r.memberId);
  const last = await lastMessages(gymId, ids, ["RENEWAL_REMINDER", "EXPIRED"]);
  const shape = (r: (typeof rows)[number]) => ({
    memberId: r.member.id,
    code: r.member.code,
    name: fullName(r.member),
    phone: r.member.phone,
    photoUrl: memberPhotoUrl(r.member),
    plan: r.plan.name,
    endDate: r.endDate,
    daysLeft: daysLeft(r.endDate),
    lastRemindedAt: last.get(r.memberId) ?? null,
  });

  const exp = expiring.sort((a, b) => a.endDate.getTime() - b.endDate.getTime()).map(shape);
  const gone = expired.sort((a, b) => b.endDate.getTime() - a.endDate.getTime()).map(shape);
  const weekAgo = addDays(today, -7);
  const all = [...exp, ...gone];
  return {
    warnDays,
    expiredLookbackDays: EXPIRED_LOOKBACK_DAYS,
    expiring: exp,
    expired: gone,
    summary: {
      expiring: exp.length,
      expired: gone.length,
      remindedThisWeek: all.filter((r) => r.lastRemindedAt && r.lastRemindedAt >= weekAgo).length,
      notReminded: all.filter((r) => !r.lastRemindedAt || r.lastRemindedAt < weekAgo).length,
    },
  };
}

export async function getCelebrations(gymId: string) {
  const today = startOfDay();
  const weekAgo = addDays(today, -7);

  // Birthdays in the next 7 days (Qatar calendar)
  const people = await db.member.findMany({
    where: { gymId, dateOfBirth: { not: null } },
    select: { id: true, code: true, firstName: true, lastName: true, phone: true, dateOfBirth: true, photoUpdatedAt: true },
  });
  const upcoming: { daysAway: number; m: (typeof people)[number]; age: number }[] = [];
  for (let d = 0; d < 7; d++) {
    const day = qatarParts(addDays(today, d));
    for (const m of people) {
      // Read the birthday in Qatar time (works for dates saved at UTC or Qatar midnight)
      const dob = qatarParts(m.dateOfBirth!);
      if (dob.month === day.month && dob.day === day.day) {
        upcoming.push({ daysAway: d, m, age: day.year - dob.year });
      }
    }
  }

  // Visit milestones crossed in the last 7 days
  const [totals, before] = await Promise.all([
    db.attendance.groupBy({ by: ["memberId"], where: { gymId }, _count: { _all: true } }),
    db.attendance.groupBy({ by: ["memberId"], where: { gymId, checkInAt: { lt: weekAgo } }, _count: { _all: true } }),
  ]);
  const beforeMap = new Map(before.map((b) => [b.memberId, b._count._all]));
  const crossed: { memberId: string; milestone: number; visits: number }[] = [];
  for (const t of totals) {
    const now = t._count._all;
    const was = beforeMap.get(t.memberId) ?? 0;
    const hit = [...MILESTONES].reverse().find((m) => was < m && now >= m);
    if (hit) crossed.push({ memberId: t.memberId, milestone: hit, visits: now });
  }
  const milestoneMembers = await db.member.findMany({
    where: { gymId, id: { in: crossed.map((c) => c.memberId) } },
    select: { id: true, code: true, firstName: true, lastName: true, phone: true, photoUpdatedAt: true },
  });
  const byId = new Map(milestoneMembers.map((m) => [m.id, m]));

  const ids = [...upcoming.map((u) => u.m.id), ...crossed.map((c) => c.memberId)];
  const [birthdayMsgs, milestoneMsgs] = await Promise.all([
    lastMessages(gymId, ids, ["BIRTHDAY"], addDays(today, -7)),
    lastMessages(gymId, ids, ["MILESTONE"], addDays(today, -14)),
  ]);

  return {
    birthdays: upcoming.map(({ daysAway, m, age }) => ({
      memberId: m.id,
      code: m.code,
      name: fullName(m),
      phone: m.phone,
      photoUrl: memberPhotoUrl(m),
      daysAway,
      turning: age,
      greetedAt: birthdayMsgs.get(m.id) ?? null,
    })),
    milestones: crossed
      .filter((c) => byId.has(c.memberId))
      .sort((a, b) => b.milestone - a.milestone)
      .map((c) => {
        const m = byId.get(c.memberId)!;
        return {
          memberId: m.id,
          code: m.code,
          name: fullName(m),
          phone: m.phone,
          photoUrl: memberPhotoUrl(m),
          milestone: c.milestone,
          visits: c.visits,
          greetedAt: milestoneMsgs.get(m.id) ?? null,
        };
      }),
  };
}
