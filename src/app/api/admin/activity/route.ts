import { route, searchParams } from "@/server/http";
import { requireRole } from "@/server/auth";
import { listAdminLog } from "@/server/services/admin-log.service";

/** GET /api/admin/activity?action=gym → what the VOXI team did, newest first */
export const GET = route(async (req) => {
  await requireRole("SUPER_ADMIN");
  return { entries: await listAdminLog({ action: searchParams(req).get("action") }) };
});
