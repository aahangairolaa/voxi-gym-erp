import type { z } from "zod";
import { db } from "../db";
import type { GymSession } from "../auth";
import { ownedOr404 } from "./_shared";
import type { expenseSchema } from "../validators";

type ExpenseInput = z.infer<typeof expenseSchema>;

export async function listExpenses(gymId: string, opts: { from?: Date | null; to?: Date | null }) {
  const expenses = await db.expense.findMany({
    where: opts.from || opts.to ? { gymId, spentAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } } : { gymId },
    orderBy: { spentAt: "desc" },
    take: 500,
    include: { branch: { select: { name: true } }, createdBy: { select: { name: true } } },
  });
  const byCategory: Record<string, number> = {};
  expenses.forEach((e) => (byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount));
  return {
    expenses: expenses.map((e) => ({ ...e, branch: e.branch?.name ?? null, createdBy: e.createdBy?.name ?? null })),
    total: expenses.reduce((s, e) => s + e.amount, 0),
    byCategory,
  };
}

export async function createExpense(input: ExpenseInput, session: GymSession) {
  const branchId = input.branchId ?? session.branchId;
  if (branchId) ownedOr404(await db.branch.findFirst({ where: { id: branchId, gymId: session.gymId }, select: { id: true } }), "Branch");
  let cashSessionId: string | null = null;
  if (input.method === "CASH") {
    const open = await db.cashSession.findFirst({ where: { gymId: session.gymId, status: "OPEN", ...(branchId ? { branchId } : {}) } });
    cashSessionId = open?.id ?? null;
  }
  return db.expense.create({
    data: { ...input, gymId: session.gymId, spentAt: input.spentAt ?? new Date(), branchId, createdById: session.staffId, cashSessionId },
  });
}

export async function deleteExpense(gymId: string, id: string) {
  const e = ownedOr404(await db.expense.findFirst({ where: { id, gymId } }), "Expense");
  await db.expense.delete({ where: { id } });
  return e;
}
