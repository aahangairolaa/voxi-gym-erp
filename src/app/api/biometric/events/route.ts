import { route, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { listEvents } from "@/server/services/biometric.service";

/** GET /api/biometric/events?limit=100 → latest scans from all devices */
export const GET = route(async (req) => {
  await requireSession("biometric");
  const limit = Math.min(500, Number(searchParams(req).get("limit") ?? 100) || 100);
  return { events: await listEvents(limit) };
});
