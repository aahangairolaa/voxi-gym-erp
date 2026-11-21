import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import { ownedOr404 } from "./_shared";

/** Cash in the drawer = opening float + cash payments − cash expenses (paid out). */
async function totalsFor(sessionId: string, openingFloat: number) {
  const [cashIn, cashOut, refunds] = await Promise.all([
    db.payment.aggregate({ where: { cashSessionId: sessionId, method: "CASH", status: "PAID" }, _sum: { amount: true }, _count: true }),
    db.expense.aggregate({ where: { cashSessionId: sessionId }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { cashSessionId: sessionId, method: "CASH", status: "REFUNDED" }, _sum: { amount: true } }),
  ]);
  const inSum = cashIn._sum.amount ?? 0;
  const outSum = cashOut._sum.amount ?? 0;
  return {
    cashIn: inSum,
    cashOut: outSum,
    refunded: refunds._sum.amount ?? 0,
    transactions: cashIn._count,
    expected: openingFloat + inSum - outSum,
  };
}

export async function listCashSessions(gymId: string) {
  const sessions = await db.cashSession.findMany({
    where: { gymId },
    orderBy: { openedAt: "desc" },
    take: 60,
    include: {
      branch: { select: { id: true, name: true } },
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });
  return Promise.all(
    sessions.map(async (s) => ({
      ...s,
      openedBy: s.openedBy.name,
      closedBy: s.closedBy?.name ?? null,
      totals: await totalsFor(s.id, s.openingFloat),
    })),
  );
}

export async function getCashSession(gymId: string, id: string) {
  const s = await db.cashSession.findFirst({
    where: { id, gymId },
    include: {
      branch: { select: { name: true } },
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
      payments: {
        orderBy: { paidAt: "desc" },
        include: { member: { select: { code: true, firstName: true, lastName: true } } },
      },
      expenses: { orderBy: { spentAt: "desc" } },
    },
  });
  if (!s) throw new ApiError(404, "Cash session not found.");
  return { ...s, totals: await totalsFor(s.id, s.openingFloat) };
}

export async function openCashSession(input: { branchId: string; openingFloat: number; notes: string | null }, session: GymSession) {
  ownedOr404(await db.branch.findFirst({ where: { id: input.branchId, gymId: session.gymId }, select: { id: true } }), "Branch");
  const existing = await db.cashSession.findFirst({ where: { branchId: input.branchId, status: "OPEN" } });
  if (existing) throw new ApiError(400, "There is already an open cash session for this branch. Close it first.");
  return db.cashSession.create({ data: { ...input, gymId: session.gymId, openedById: session.staffId } });
}

export async function closeCashSession(id: string, input: { countedCash: number; notes: string | null }, session: GymSession) {
  const s = await db.cashSession.findFirst({ where: { id, gymId: session.gymId } });
  if (!s) throw new ApiError(404, "Cash session not found.");
  if (s.status === "CLOSED") throw new ApiError(400, "This session is already closed.");
  const totals = await totalsFor(id, s.openingFloat);
  return db.cashSession.update({
    where: { id },
    data: {
      status: "CLOSED",
      countedCash: input.countedCash,
      expectedCash: totals.expected,
      difference: input.countedCash - totals.expected,
      notes: input.notes ?? s.notes,
      closedById: session.staffId,
      closedAt: new Date(),
    },
  });
}
