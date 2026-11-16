import type { z } from "zod";
import { db } from "../db";
import type { Session } from "../session-token";
import type { expenseSchema } from "../validators";

type ExpenseInput = z.infer<typeof expenseSchema>;

export async function listExpenses(opts: { from?: Date | null; to?: Date | null }) {
  const expenses = await db.expense.findMany({
    where: opts.from || opts.to ? { spentAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } } : {},
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

export async function createExpense(input: ExpenseInput, session: Session) {
  const branchId = input.branchId ?? session.branchId;
  let cashSessionId: string | null = null;
  if (input.method === "CASH") {
    const open = await db.cashSession.findFirst({ where: { status: "OPEN", ...(branchId ? { branchId } : {}) } });
    cashSessionId = open?.id ?? null;
  }
  return db.expense.create({
    data: { ...input, spentAt: input.spentAt ?? new Date(), branchId, createdById: session.staffId, cashSessionId },
  });
}

export async function deleteExpense(id: string) {
  await db.expense.delete({ where: { id } });
  return { ok: true };
}
