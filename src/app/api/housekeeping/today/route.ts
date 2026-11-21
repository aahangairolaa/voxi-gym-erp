import { route, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getToday } from "@/server/services/housekeeping.service";

/** GET /api/housekeeping/today?branchId=&mine=1 → today's checklist, progress, open issues */
export const GET = route(async (req) => {
  const s = await requireGym("housekeeping");
  const q = searchParams(req);
  return getToday(s, { branchId: q.get("branchId"), mine: q.get("mine") === "1" });
});
