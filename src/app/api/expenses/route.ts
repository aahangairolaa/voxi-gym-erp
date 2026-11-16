import { route, readBody, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { endOfDay, fromDateInput } from "@/lib/dates";
import { expenseSchema } from "@/server/validators";
import { createExpense, listExpenses } from "@/server/services/expenses.service";

/** GET /api/expenses?from=&to= */
export const GET = route(async (req) => {
  await requireSession("expenses");
  const q = searchParams(req);
  return listExpenses({
    from: q.get("from") ? fromDateInput(q.get("from")!) : null,
    to: q.get("to") ? endOfDay(fromDateInput(q.get("to")!)) : null,
  });
});

export const POST = route(async (req) => {
  const session = await requireSession("expenses");
  return createExpense(await readBody(req, expenseSchema), session);
});
