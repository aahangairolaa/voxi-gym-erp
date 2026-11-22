import { route, readBody } from "@/server/http";
import { setSessionCookie } from "@/server/auth";
import { loginSchema } from "@/server/validators";
import { homeFor } from "@/lib/permissions";
import { login } from "@/server/services/auth.service";

/**
 * POST /api/auth/login  { email, password, code? } → sets the session cookie; `home` is where to go next.
 * The first password sign-in of an account answers { needsCode: true } and emails a code; send it back as `code`.
 */
export const POST = route(async (req) => {
  const { email, password, code } = await readBody(req, loginSchema);
  const result = await login(email, password, code);
  if ("needsCode" in result) return result;
  const session = result;
  await setSessionCookie(session);
  return { user: session, home: homeFor(session.role) };
});
