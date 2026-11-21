import { route, readBody } from "@/server/http";
import { appOrigin } from "@/server/google";
import { forgotPasswordSchema } from "@/server/validators";
import { requestPasswordReset } from "@/server/services/auth.service";

/** POST /api/auth/forgot (public) { email } — emails a reset link if that account exists */
export const POST = route(async (req) => {
  const { email } = await readBody(req, forgotPasswordSchema);
  return requestPasswordReset(email, appOrigin(req.nextUrl.origin));
});
