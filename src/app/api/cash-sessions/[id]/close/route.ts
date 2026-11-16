import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { closeCashSchema } from "@/server/validators";
import { closeCashSession } from "@/server/services/cash.service";

/** POST /api/cash-sessions/:id/close  { countedCash, notes } */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const session = await requireSession("cash");
  return closeCashSession(id, await readBody(req, closeCashSchema), session);
});
