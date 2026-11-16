import { addMonths, monthKey, qatarParts, startOfMonth } from "@/lib/dates";
import { db } from "../db";
import { fullName, toCsv } from "./_shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthBuckets(from: Date, to: Date) {
  const out: { key: string; label: string; revenue: number; expenses: number; newMembers: number }[] = [];
  let d = startOfMonth(from);
  while (d <= to && out.length < 36) {
    const { month, year } = qatarParts(d);
    out.push({ key: monthKey(d), label: `${MONTHS[month]} ${String(year).slice(2)}`, revenue: 0, expenses: 0, newMembers: 0 });
    d = addMonths(d, 1);
  }
  return out;
}

export async function getReport(from: Date, to: Date) {
  const [payments, expenses, newMembers, visits, sales] = await Promise.all([
    db.payment.findMany({
      where: { status: "PAID", paidAt: { gte: from, lte: to } },
      select: { amount: true, method: true, paidAt: true, membership: { select: { plan: { select: { name: true } } } } },
    }),
    db.expense.findMany({ where: { spentAt: { gte: from, lte: to } }, select: { amount: true, category: true, spentAt: true } }),
    db.member.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
    db.attendance.findMany({ where: { checkInAt: { gte: from, lte: to } }, select: { checkInAt: true, memberId: true } }),
    db.membership.groupBy({ by: ["planId"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
  ]);

  const months = monthBuckets(from, to);
  const find = (d: Date) => months.find((m) => m.key === monthKey(d));

  const byMethod: Record<string, number> = {};
  const byPlan: Record<string, number> = {};
  for (const p of payments) {
    byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
    const plan = p.membership?.plan.name ?? "Other / PT / Retail";
    byPlan[plan] = (byPlan[plan] ?? 0) + p.amount;
    const m = find(p.paidAt);
    if (m) m.revenue += p.amount;
  }
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    const m = find(e.spentAt);
    if (m) m.expenses += e.amount;
  }
  for (const n of newMembers) {
    const m = find(n.createdAt);
    if (m) m.newMembers++;
  }

  // Busy-hours heatmap: 7 weekdays × 24 hours (Qatar time)
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const v of visits) {
    const { weekday, hour } = qatarParts(v.checkInAt);
    heatmap[weekday]![hour]!++;
  }

  const plans = await db.plan.findMany({ where: { id: { in: sales.map((s) => s.planId) } }, select: { id: true, name: true, color: true } });
  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return {
    range: { from, to },
    totals: {
      revenue,
      expenses: expenseTotal,
      net: revenue - expenseTotal,
      newMembers: newMembers.length,
      visits: visits.length,
      uniqueVisitors: new Set(visits.map((v) => v.memberId)).size,
      membershipsSold: sales.reduce((s, x) => s + x._count._all, 0),
    },
    months: months.map(({ key: _k, ...m }) => m),
    byMethod: Object.entries(byMethod).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    byPlan: Object.entries(byPlan).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    byCategory: Object.entries(byCategory).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    planSales: sales
      .map((s) => {
        const p = plans.find((x) => x.id === s.planId);
        return { label: p?.name ?? "Unknown", color: p?.color ?? "#7C5CFF", value: s._count._all };
      })
      .sort((a, b) => b.value - a.value),
    heatmap,
  };
}

/** Builds a CSV file for download. */
export async function exportCsv(type: string, from: Date, to: Date): Promise<string> {
  switch (type) {
    case "members": {
      const rows = await db.member.findMany({ orderBy: { code: "asc" }, include: { branch: { select: { name: true } } } });
      return toCsv(
        rows.map((m) => ({
          code: m.code, name: fullName(m), phone: m.phone, email: m.email, gender: m.gender, nationality: m.nationality,
          qid: m.qid, branch: m.branch?.name, biometricId: m.biometricId, joined: m.createdAt,
        })),
      );
    }
    case "payments": {
      const rows = await db.payment.findMany({
        where: { paidAt: { gte: from, lte: to } },
        orderBy: { paidAt: "asc" },
        include: { member: { select: { code: true, firstName: true, lastName: true } }, receivedBy: { select: { name: true } } },
      });
      return toCsv(
        rows.map((p) => ({
          invoice: p.invoiceNo, date: p.paidAt, member: p.member ? fullName(p.member) : "", memberCode: p.member?.code,
          amountQAR: p.amount, method: p.method, status: p.status, description: p.description, reference: p.reference, receivedBy: p.receivedBy?.name,
        })),
      );
    }
    case "attendance": {
      const rows = await db.attendance.findMany({
        where: { checkInAt: { gte: from, lte: to } },
        orderBy: { checkInAt: "asc" },
        include: { member: { select: { code: true, firstName: true, lastName: true } }, branch: { select: { name: true } } },
      });
      return toCsv(
        rows.map((a) => ({
          member: fullName(a.member), memberCode: a.member.code, branch: a.branch?.name, checkIn: a.checkInAt, checkOut: a.checkOutAt, source: a.source,
        })),
      );
    }
    case "expenses": {
      const rows = await db.expense.findMany({ where: { spentAt: { gte: from, lte: to } }, orderBy: { spentAt: "asc" } });
      return toCsv(rows.map((e) => ({ date: e.spentAt, category: e.category, description: e.description, amountQAR: e.amount, method: e.method })));
    }
    default:
      return "";
  }
}
