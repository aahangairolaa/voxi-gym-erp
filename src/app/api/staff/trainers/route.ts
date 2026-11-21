import { route, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { listAssignable, listTrainers } from "@/server/services/staff.service";

/** GET /api/staff/trainers → trainers for dropdowns.  ?role=HOUSEKEEPING (or ?role=ALL) → other staff lists */
export const GET = route(async (req) => {
  const s = await requireGym();
  const role = searchParams(req).get("role");
  if (role) return { staff: await listAssignable(s.gymId, role === "ALL" ? null : role) };
  return { trainers: await listTrainers(s.gymId) };
});
