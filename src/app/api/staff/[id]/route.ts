import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { staffSchema } from "@/server/validators";
import { updateStaff } from "@/server/services/staff.service";

/** PUT /api/staff/:id  (leave password empty to keep the current one) */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  const session = await requireSession("staff");
  return updateStaff(id, await readBody(req, staffSchema), session);
});
