import { z } from "zod";
import { route, readBody } from "@/server/http";
import { forgetAccess, requireRole } from "@/server/auth";
import { updateGymSchema } from "@/server/validators";
import { updateGym } from "@/server/services/admin.service";
import { deleteGym } from "@/server/services/platform.service";

/** PUT /api/admin/gyms/:id  { plan?, status?, trialEndsAt?, platformNotes?, name? } */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  await requireRole("SUPER_ADMIN");
  const g = await updateGym(id, await readBody(req, updateGymSchema));
  forgetAccess(); // status / trial changes apply to signed-in staff right away
  return g;
});

/** DELETE /api/admin/gyms/:id { confirmName } → permanently deletes a SUSPENDED gym and all its data */
export const DELETE = route<{ id: string }>(async (req, { id }) => {
  const s = await requireRole("SUPER_ADMIN");
  const { confirmName } = await readBody(req, z.object({ confirmName: z.string().min(1, "Type the gym's name to confirm") }));
  const r = await deleteGym(id, confirmName, s.name);
  forgetAccess(); // sign its staff out everywhere
  return r;
});
