import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { updateGymSchema } from "@/server/validators";
import { updateGym } from "@/server/services/admin.service";

/** PUT /api/admin/gyms/:id  { plan?, status?, trialEndsAt?, platformNotes?, name? } */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  await requireRole("SUPER_ADMIN");
  return updateGym(id, await readBody(req, updateGymSchema));
});
