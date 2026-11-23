/**
 * Sales: what the gym sold in a day, month or year, by what, by whom, and from which source.
 * Revenue = paid payments (memberships, PT, extras, anything else) + café sales.
 */
import { addDays, addMonths, fromDateInput, qatarParts, startOfDay, startOfMonth } from "@/lib/dates";
import { db } from "../db";
import { fullName } from "./_shared";

export type Period = "day" | "month" | "year";
export type SaleKind = "MEMBERSHIP" | "PT" | "EXTRA" | "OTHER" | "CAFE";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOfYear = (d: Date) => fromDateInput(`${qatarParts(d).year}-01-01`);
const addYears = (d: Date, n: number) => fromDateInput(`${qatarParts(d).year + n}-01-01`);

/** The time range a period covers, around an anchor date. */
export function rangeFor(period: Period, anchor: Date) {
  if (period === "day") {
    const from = startOfDay(anchor);
    const { day, month, year, weekday } = qatarParts(from);
    return { from, to: addDays(from, 1), label: `${WEEKDAYS[weekday]} ${day} ${MONTHS[month]} ${year}` };
  }
  if (period === "month") {
    const from = startOfMonth(anchor);
    const { month, year } = qatarParts(from);
    return { from, to: addMonths(from, 1), label: `${MONTHS[month]} ${year}` };
  }
  const from = startOfYear(anchor);
  return { from, to: addYears(from, 1), label: String(qatarParts(from).year) };
}

function kindOf(p: { ptPackageId: string | null; extraItemId: string | null; membershipId: string | null }): SaleKind {
  if (p.ptPackageId) return "PT";
  if (p.extraItemId) return "EXTRA";
  if (p.membershipId) return "MEMBERSHIP";
  return "OTHER";
}

/**
 * Revenue over time for the dashboard chart.
 * day = the last 30 days, month = the last 12 months, year = the last 5 years.
 */
export async function salesTimeline(gymId: string, period: Period) {
  const now = new Date();
  const buckets: { from: Date; to: Date; label: string; value: number }[] = [];
  if (period === "day") {
    const first = addDays(startOfDay(now), -29);
    for (let i = 0; i < 30; i++) {
      const from = addDays(first, i);
      const { day, month } = qatarParts(from);
      buckets.push({ from, to: addDays(from, 1), label: `${day} ${MONTHS[month]}`, value: 0 });
    }
  } else if (period === "month") {
    for (let i = 11; i >= 0; i--) {
      const from = addMonths(now, -i);
      const { month, year } = qatarParts(from);
      buckets.push({ from, to: addMonths(from, 1), label: `${MONTHS[month]}${month === 0 || i === 11 ? ` ${String(year).slice(2)}` : ""}`, value: 0 });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const from = addYears(now, -i);
      buckets.push({ from, to: addYears(from, 1), label: String(qatarParts(from).year), value: 0 });
    }
  }
  const start = buckets[0]!.from;
  const [payments, cafe] = await Promise.all([
    db.payment.findMany({ where: { gymId, status: "PAID", paidAt: { gte: start } }, select: { amount: true, paidAt: true } }),
    db.cafeSale.findMany({ where: { gymId, createdAt: { gte: start } }, select: { total: true, createdAt: true } }),
  ]);
  const put = (at: Date, amount: number) => {
    const b = buckets.find((x) => at >= x.from && at < x.to);
    if (b) b.value += amount;
  };
  for (const p of payments) put(p.paidAt, p.amount);
  for (const c of cafe) put(c.createdAt, c.total);

  const current = buckets[buckets.length - 1]!.value;
  const previous = buckets[buckets.length - 2]?.value ?? 0;
  return {
    period,
    buckets: buckets.map(({ label, value }) => ({ label, value })),
    total: buckets.reduce((a, b) => a + b.value, 0),
    current,
    previous,
    change: previous ? Math.round(((current - previous) / previous) * 100) : null,
  };
}

/** Everything sold in one day, month or year. */
export async function salesReport(gymId: string, period: Period, anchor: Date) {
  const r = rangeFor(period, anchor);
  const inRange = { gte: r.from, lt: r.to };

  const [payments, refunds, cafe, newMembers, membershipsSold, ptSold, staff] = await Promise.all([
    db.payment.findMany({
      where: { gymId, status: "PAID", paidAt: inRange },
      orderBy: { paidAt: "desc" },
      select: {
        id: true, invoiceNo: true, amount: true, method: true, paidAt: true, description: true, quantity: true,
        membershipId: true, ptPackageId: true, extraItemId: true, soldById: true,
        member: { select: { id: true, firstName: true, lastName: true, code: true } },
        soldBy: { select: { id: true, name: true } },
        membership: { select: { plan: { select: { name: true } } } },
        ptPackage: { select: { name: true, trainer: { select: { name: true } } } },
        extraItem: { select: { name: true } },
      },
    }),
    db.payment.aggregate({ where: { gymId, status: "REFUNDED", paidAt: inRange }, _sum: { amount: true }, _count: true }),
    db.cafeSale.aggregate({ where: { gymId, createdAt: inRange }, _sum: { total: true }, _count: true }),
    db.member.findMany({ where: { gymId, createdAt: inRange }, select: { source: true, ptOnly: true } }),
    db.membership.findMany({ where: { gymId, createdAt: inRange }, select: { soldById: true } }),
    db.ptPackage.findMany({ where: { gymId, createdAt: inRange }, select: { soldById: true } }),
    db.staff.findMany({ where: { gymId }, select: { id: true, name: true, role: true, photoUpdatedAt: true } }),
  ]);

  const cafeTotal = cafe._sum.total ?? 0;
  const byKind: Record<SaleKind, { amount: number; count: number }> = {
    MEMBERSHIP: { amount: 0, count: 0 }, PT: { amount: 0, count: 0 }, EXTRA: { amount: 0, count: 0 }, OTHER: { amount: 0, count: 0 },
    CAFE: { amount: cafeTotal, count: cafe._count },
  };
  const byMethod = new Map<string, number>();
  for (const p of payments) {
    const k = kindOf(p);
    byKind[k].amount += p.amount;
    byKind[k].count += 1;
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
  }

  // New members by how they found the gym
  const bySource = new Map<string, number>();
  for (const m of newMembers) bySource.set(m.source ?? "NONE", (bySource.get(m.source ?? "NONE") ?? 0) + 1);

  // Staff sales board
  type Row = { staffId: string | null; name: string; role: string | null; memberships: number; pt: number; extras: number; revenue: number; sales: number };
  const rows = new Map<string, Row>();
  const row = (id: string | null) => {
    const key = id ?? "none";
    let x = rows.get(key);
    if (!x) {
      const s = id ? staff.find((st) => st.id === id) : null;
      x = { staffId: id, name: s?.name ?? "Not recorded", role: s?.role ?? null, memberships: 0, pt: 0, extras: 0, revenue: 0, sales: 0 };
      rows.set(key, x);
    }
    return x;
  };
  for (const m of membershipsSold) row(m.soldById).memberships++;
  for (const p of ptSold) row(p.soldById).pt++;
  for (const p of payments) {
    const x = row(p.soldById);
    x.revenue += p.amount;
    x.sales++;
    if (kindOf(p) === "EXTRA") x.extras += p.quantity ?? 1;
  }
  const board = [...rows.values()].sort((a, b) => (a.staffId === null ? 1 : b.staffId === null ? -1 : b.revenue - a.revenue || b.memberships - a.memberships));

  const revenue = payments.reduce((a, p) => a + p.amount, 0) + cafeTotal;

  return {
    period,
    label: r.label,
    from: r.from,
    to: r.to,
    totals: {
      revenue,
      sales: payments.length + cafe._count,
      newMembers: newMembers.length,
      ptOnlyMembers: newMembers.filter((m) => m.ptOnly).length,
      membershipsSold: membershipsSold.length,
      ptPackagesSold: ptSold.length,
      refunded: refunds._sum.amount ?? 0,
      refunds: refunds._count,
    },
    byKind,
    byMethod: [...byMethod.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount),
    bySource: [...bySource.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    board,
    sales: payments.slice(0, 300).map((p) => {
      const kind = kindOf(p);
      const item =
        kind === "MEMBERSHIP" ? `${p.membership?.plan.name ?? "Membership"}`
        : kind === "PT" ? `${p.ptPackage?.name ?? "Personal training"}${p.ptPackage?.trainer ? ` with ${p.ptPackage.trainer.name}` : ""}`
        : kind === "EXTRA" ? `${p.quantity && p.quantity > 1 ? `${p.quantity} × ` : ""}${p.extraItem?.name ?? "Extra"}`
        : p.description ?? "Payment";
      return {
        id: p.id,
        invoiceNo: p.invoiceNo,
        at: p.paidAt,
        kind,
        item,
        amount: p.amount,
        method: p.method,
        member: p.member ? { id: p.member.id, name: fullName(p.member), code: p.member.code } : null,
        soldBy: p.soldBy?.name ?? null,
      };
    }),
  };
}
