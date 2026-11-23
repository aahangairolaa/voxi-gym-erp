import { route } from "@/server/http";
import { requireRole } from "@/server/auth";
import { listDeletedGyms } from "@/server/services/platform.service";

/** GET /api/admin/deleted → plain list of gyms that were deleted (name, owner email, when, by whom) */
export const GET = route(async () => {
  await requireRole("SUPER_ADMIN");
  return { gyms: await listDeletedGyms() };
});
