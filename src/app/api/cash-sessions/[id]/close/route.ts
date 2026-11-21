import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { closeCashSchema } from "@/server/validators";
import { closeCashSession } from "@/server/services/cash.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/cash-sessions/:id/close  { countedCash, notes } */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("cash");
  const c = await closeCashSession(id, await readBody(req, closeCashSchema), s);
  const diff = c.difference ?? 0;
  await audit(s, "cash.close", "CashSession", id, `Closed the cash drawer: counted QAR ${c.countedCash}${diff ? ` (${diff > 0 ? "+" : "−"}QAR ${Math.abs(diff)} difference)` : ", balanced"}`);
  return c;
});
