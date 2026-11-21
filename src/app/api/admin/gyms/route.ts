import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { createGymSchema } from "@/server/validators";
import { createGym, listGyms } from "@/server/services/admin.service";

/** GET /api/admin/gyms → every gym on VOXI with size & activity (VOXI admins only) */
export const GET = route(async () => {
  await requireRole("SUPER_ADMIN");
  return listGyms();
});

/** POST /api/admin/gyms → create a gym + owner account + starter data */
export const POST = route(async (req) => {
  await requireRole("SUPER_ADMIN");
  return createGym(await readBody(req, createGymSchema));
});
