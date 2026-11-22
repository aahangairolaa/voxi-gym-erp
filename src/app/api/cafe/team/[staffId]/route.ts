import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { cafeRoleSchema } from "@/server/validators";
import { setCafeRole } from "@/server/services/cafe.service";
import { audit } from "@/server/services/audit.service";

/** PUT /api/cafe/team/:staffId { cafeRole } → put someone on the café team (or take them off with null) */
export const PUT = route<{ staffId: string }>(async (req, { staffId }) => {
  const s = await requireGym("cafe");
  const { cafeRole } = await readBody(req, cafeRoleSchema);
  const st = await setCafeRole(s, staffId, cafeRole);
  await audit(s, "cafe.team", "Staff", staffId, cafeRole ? `${st.name} works in the café as ${cafeRole}` : `${st.name} taken off the café team`);
  return st;
});
