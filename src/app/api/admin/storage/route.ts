import { route } from "@/server/http";
import { requireRole } from "@/server/auth";
import { storageReport } from "@/server/services/platform.service";

/** GET /api/admin/storage → database size, the biggest tables, and roughly how much each gym uses */
export const GET = route(async () => {
  await requireRole("SUPER_ADMIN");
  return storageReport();
});
