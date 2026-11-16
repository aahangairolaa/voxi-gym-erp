import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { listTrainers } from "@/server/services/staff.service";

/** GET /api/staff/trainers → for dropdowns (any logged-in staff) */
export const GET = route(async () => {
  await requireSession();
  return { trainers: await listTrainers() };
});
