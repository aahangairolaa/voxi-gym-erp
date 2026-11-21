import { route, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { listActivity } from "@/server/services/audit.service";

/** GET /api/activity?staffId=&area=payment → who did what (owner & manager) */
export const GET = route(async (req) => {
  const s = await requireGym("activity");
  const q = searchParams(req);
  return { activity: await listActivity(s.gymId, { staffId: q.get("staffId"), area: q.get("area") }) };
});
