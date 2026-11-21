import { route, readBody } from "@/server/http";
import { resetPasswordSchema } from "@/server/validators";
import { resetPassword } from "@/server/services/auth.service";

/** POST /api/auth/reset (public) { token, password } */
export const POST = route(async (req) => {
  const { token, password } = await readBody(req, resetPasswordSchema);
  return resetPassword(token, password);
});
