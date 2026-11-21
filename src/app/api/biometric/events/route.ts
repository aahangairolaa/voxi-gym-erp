import { route, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { listEvents } from "@/server/services/biometric.service";

/** GET /api/biometric/events?limit=100 → latest scans from this gym's devices */
export const GET = route(async (req) => {
  const s = await requireGym("biometric");
  const limit = Math.min(500, Number(searchParams(req).get("limit") ?? 100) || 100);
  return { events: await listEvents(s.gymId, limit) };
});
