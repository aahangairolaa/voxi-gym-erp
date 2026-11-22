import { cookies } from "next/headers";
import { route, readBody } from "@/server/http";
import { setSessionCookie } from "@/server/auth";
import { GOOGLE_SIGNUP_COOKIE, readSignup } from "@/server/google";
import { registerSchema } from "@/server/validators";
import { registerGym } from "@/server/services/auth.service";
import { audit } from "@/server/services/audit.service";

/**
 * POST /api/auth/register (public) — start a 7-day free trial:
 * { gymName, ownerName, email, phone?, password?, acceptTerms: true }
 * After "Continue with Google/Microsoft", password may be left out (that account is linked instead).
 */
export const POST = route(async (req) => {
  const input = await readBody(req, registerSchema);
  const store = await cookies();
  const google = await readSignup(store.get(GOOGLE_SIGNUP_COOKIE)?.value);
  const via = google && google.email === input.email ? google : null;
  const viaGoogle = via?.provider !== "microsoft" ? via : null;
  const viaMicrosoft = via?.provider === "microsoft" ? via : null;
  const session = await registerGym({
    gymName: input.gymName,
    ownerName: input.ownerName,
    email: input.email,
    phone: input.phone ?? null,
    password: input.password ?? null,
    googleId: viaGoogle?.sub ?? null,
    microsoftId: viaMicrosoft?.sub ?? null,
  });
  if (google) store.delete(GOOGLE_SIGNUP_COOKIE);
  await setSessionCookie(session);
  await audit(session as typeof session & { gymId: string }, "settings.signup", "Gym", session.gymId, `Created the gym account (${viaGoogle ? "Google" : viaMicrosoft ? "Microsoft" : "email"} sign-up)`);
  return { user: session, home: "/dashboard?welcome=1" };
});
