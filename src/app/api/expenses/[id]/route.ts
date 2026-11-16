import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { deleteExpense } from "@/server/services/expenses.service";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await requireSession("expenses");
  return deleteExpense(id);
});
