import { addDays, addMonths, monthKey, qatarParts, startOfDay, startOfMonth } from "@/lib/dates";
import { db } from "../db";
import { daysLeft, fullName, getWarnDays } from "./_shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getDashboard() {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);
  const lastMonthStart = addMonths(now, -1);
  const sixMonthsAgo = addMonths(now, -5);
  const twoWeeksAgo = addDays(today, -13);
  const warnDays = await getWarnDays();

  const [
    runningMemberships,
    totalMembers,
    newMembers,
    revThisMonth,
    revLastMonth,
    todayVisits,
    insideNow,
    payments6m,
    visits14d,
    recentPayments,
    recentVisits,
    classesToday,
    openLeads,
  ] = await Promise.all([
    db.membership.findMany({
      where: { status: { in: ["ACTIVE", "FROZEN"] }, endDate: { gte: today } },
      select: {
        memberId: true,
        status: true,
        endDate: true,
        plan: { select: { id: true, name: true, color: true } },
        member: { select: { firstName: true, lastName: true, code: true, phone: true } },
      },
    }),
    db.member.count(),
    db.member.count({ where: { createdAt: { gte: monthStart } } }),
    db.payment.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    // Same number of days last month, so mid-month comparisons are fair
    db.payment.aggregate({ where: { status: "PAID", paidAt: { gte: lastMonthStart, lt: new Date(lastMonthStart.getTime() + (now.getTime() - monthStart.getTime())) } }, _sum: { amount: true } }),
    db.attendance.count({ where: { checkInAt: { gte: today } } }),
    db.attendance.count({ where: { checkInAt: { gte: today }, checkOutAt: null } }),
    db.payment.findMany({ where: { status: "PAID", paidAt: { gte: sixMonthsAgo } }, select: { amount: true, paidAt: true } }),
    db.attendance.findMany({ where: { checkInAt: { gte: twoWeeksAgo } }, select: { checkInAt: true } }),
    db.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 6,
      include: { member: { select: { id: true, firstName: true, lastName: true } }, membership: { select: { plan: { select: { name: true } } } } },
    }),
    db.attendance.findMany({
      orderBy: { checkInAt: "desc" },
      take: 6,
      include: { member: { select: { id: true, firstName: true, lastName: true, code: true } } },
    }),
    db.gymClass.findMany({
      where: { startsAt: { gte: today, lt: addDays(today, 1) } },
      orderBy: { startsAt: "asc" },
      include: { trainer: { select: { name: true } }, _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
    }),
    db.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "TRIAL"] } } }),
  ]);

  // Keep only each member's latest running membership
  const latest = new Map<string, (typeof runningMemberships)[number]>();
  for (const m of runningMemberships) {
    const prev = latest.get(m.memberId);
    if (!prev || prev.endDate < m.endDate) latest.set(m.memberId, m);
  }
  const running = [...latest.values()];
  const active = running.filter((m) => m.status === "ACTIVE");
  const frozen = running.filter((m) => m.status === "FROZEN");
  const warnLimit = addDays(today, warnDays + 1);
  const expiring = active
    .filter((m) => m.endDate < warnLimit)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .map((m) => ({
      memberId: m.memberId,
      name: fullName(m.member),
      code: m.member.code,
      phone: m.member.phone,
      plan: m.plan.name,
      endDate: m.endDate,
      daysLeft: daysLeft(m.endDate),
    }));

  // Revenue per month (last 6 months)
  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = addMonths(now, i - 5);
    return { key: monthKey(d), label: MONTHS[qatarParts(d).month]!, value: 0 };
  });
  for (const p of payments6m) {
    const bucket = revenueByMonth.find((b) => b.key === monthKey(p.paidAt));
    if (bucket) bucket.value += p.amount;
  }

  // Check-ins per day (last 14 days)
  const visitsByDay = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(twoWeeksAgo, i);
    const { day, month } = qatarParts(d);
    return { key: d.getTime(), label: `${day} ${MONTHS[month]}`, value: 0 };
  });
  for (const v of visits14d) {
    const idx = Math.floor((startOfDay(v.checkInAt).getTime() - twoWeeksAgo.getTime()) / 86_400_000);
    if (visitsByDay[idx]) visitsByDay[idx]!.value++;
  }

  // Plan mix among active members
  const planMix = new Map<string, { name: string; color: string; value: number }>();
  for (const m of active) {
    const e = planMix.get(m.plan.id) ?? { name: m.plan.name, color: m.plan.color, value: 0 };
    e.value++;
    planMix.set(m.plan.id, e);
  }

  const thisMonth = revThisMonth._sum.amount ?? 0;
  const lastMonth = revLastMonth._sum.amount ?? 0;

  return {
    kpis: {
      activeMembers: active.length,
      frozenMembers: frozen.length,
      totalMembers,
      newMembers,
      revenueThisMonth: thisMonth,
      revenueLastMonth: lastMonth,
      revenueChange: lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
      todayVisits,
      insideNow,
      expiringSoon: expiring.length,
      openLeads,
    },
    revenueByMonth: revenueByMonth.map(({ label, value }) => ({ label, value })),
    visitsByDay: visitsByDay.map(({ label, value }) => ({ label, value })),
    planMix: [...planMix.values()].sort((a, b) => b.value - a.value),
    expiring: expiring.slice(0, 8),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      invoiceNo: p.invoiceNo,
      amount: p.amount,
      method: p.method,
      status: p.status,
      paidAt: p.paidAt,
      member: p.member ? { id: p.member.id, name: fullName(p.member) } : null,
      description: p.description ?? p.membership?.plan.name ?? null,
    })),
    recentVisits: recentVisits.map((v) => ({
      id: v.id,
      checkInAt: v.checkInAt,
      checkOutAt: v.checkOutAt,
      source: v.source,
      member: { id: v.member.id, code: v.member.code, name: fullName(v.member) },
    })),
    classesToday: classesToday.map((c) => ({
      id: c.id,
      name: c.name,
      startsAt: c.startsAt,
      durationMin: c.durationMin,
      trainer: c.trainer?.name ?? null,
      booked: c._count.bookings,
      capacity: c.capacity,
      room: c.room,
    })),
  };
}
