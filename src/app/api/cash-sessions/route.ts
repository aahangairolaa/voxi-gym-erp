import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { openCashSchema } from "@/server/validators";
import { listCashSessions, openCashSession } from "@/server/services/cash.service";

/** GET /api/cash-sessions */
export const GET = route(async () => {
  await requireSession("cash");
  return { sessions: await listCashSessions() };
});

/** POST /api/cash-sessions → open the drawer  { branchId, openingFloat } */
export const POST = route(async (req) => {
  const session = await requireSession("cash");
  return openCashSession(await readBody(req, openCashSchema), session);
});
