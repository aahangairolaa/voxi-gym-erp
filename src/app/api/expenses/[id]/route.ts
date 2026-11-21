import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { deleteExpense } from "@/server/services/expenses.service";
import { audit } from "@/server/services/audit.service";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("expenses");
  const e = await deleteExpense(s.gymId, id);
  await audit(s, "expense.delete", "Expense", id, `Deleted expense: ${e.category} QAR ${e.amount}`);
  return { ok: true };
});
