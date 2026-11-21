import { route, readBody, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { endOfDay, fromDateInput } from "@/lib/dates";
import { expenseSchema } from "@/server/validators";
import { createExpense, listExpenses } from "@/server/services/expenses.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/expenses?from=&to= */
export const GET = route(async (req) => {
  const s = await requireGym("expenses");
  const q = searchParams(req);
  return listExpenses(s.gymId, {
    from: q.get("from") ? fromDateInput(q.get("from")!) : null,
    to: q.get("to") ? endOfDay(fromDateInput(q.get("to")!)) : null,
  });
});

export const POST = route(async (req) => {
  const s = await requireGym("expenses");
  const e = await createExpense(await readBody(req, expenseSchema), s);
  await audit(s, "expense.create", "Expense", e.id, `Added expense: ${e.category} QAR ${e.amount}`);
  return e;
});
