import { route, readBody } from "@/server/http";
import { forgetAccess, requireGym } from "@/server/auth";
import { staffSchema } from "@/server/validators";
import { updateStaff } from "@/server/services/staff.service";
import { audit } from "@/server/services/audit.service";

/** PUT /api/staff/:id  (leave password empty to keep the current one) */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("staff");
  const input = await readBody(req, staffSchema);
  const st = await updateStaff(id, input, s);
  forgetAccess(id); // a deactivation or new password takes effect straight away
  await audit(s, "staff.update", "Staff", id, `Edited ${st.name}'s account${input.password ? " and reset the password" : ""}${st.isActive ? "" : " (deactivated)"}`);
  return st;
});
