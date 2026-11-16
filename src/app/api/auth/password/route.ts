import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { passwordChangeSchema } from "@/server/validators";
import { changeOwnPassword } from "@/server/services/staff.service";

/** POST /api/auth/password  { currentPassword, newPassword } */
export const POST = route(async (req) => {
  const session = await requireSession();
  const { currentPassword, newPassword } = await readBody(req, passwordChangeSchema);
  return changeOwnPassword(session, currentPassword, newPassword);
});
