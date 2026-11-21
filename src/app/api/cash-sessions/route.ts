import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { openCashSchema } from "@/server/validators";
import { listCashSessions, openCashSession } from "@/server/services/cash.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/cash-sessions */
export const GET = route(async () => {
  const s = await requireGym("cash");
  return { sessions: await listCashSessions(s.gymId) };
});

/** POST /api/cash-sessions → open the drawer  { branchId, openingFloat } */
export const POST = route(async (req) => {
  const s = await requireGym("cash");
  const c = await openCashSession(await readBody(req, openCashSchema), s);
  await audit(s, "cash.open", "CashSession", c.id, `Opened the cash drawer with a QAR ${c.openingFloat} float`);
  return c;
});
