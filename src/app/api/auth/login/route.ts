import { route, readBody } from "@/server/http";
import { setSessionCookie } from "@/server/auth";
import { loginSchema } from "@/server/validators";
import { login } from "@/server/services/auth.service";

/** POST /api/auth/login  { email, password } */
export const POST = route(async (req) => {
  const { email, password } = await readBody(req, loginSchema);
  const session = await login(email, password);
  await setSessionCookie(session);
  return { user: session };
});
