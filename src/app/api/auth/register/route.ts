import { cookies } from "next/headers";
import { route, readBody } from "@/server/http";
import { setSessionCookie } from "@/server/auth";
import { GOOGLE_SIGNUP_COOKIE, readSignup } from "@/server/google";
import { registerSchema } from "@/server/validators";
import { registerGym } from "@/server/services/auth.service";
import { checkCode, sendCode } from "@/server/services/verify.service";
import { emailEnabled } from "@/server/email";
import { ApiError } from "@/server/http";
import { db } from "@/server/db";
import { audit } from "@/server/services/audit.service";

/**
 * POST /api/auth/register (public) — start a 7-day free trial:
 * { gymName, firstName, lastName, email, phone, password?, acceptTerms: true, marketingOptIn? }
 * After "Continue with Google/Microsoft", password may be left out (that account is linked instead).
 *
 * Email sign-ups are two steps: the first call emails a 6-digit code and answers { needsCode: true };
 * the second call repeats the form with `code` and creates the gym.
 */
export const POST = route(async (req) => {
  const input = await readBody(req, registerSchema);
  const store = await cookies();
  const google = await readSignup(store.get(GOOGLE_SIGNUP_COOKIE)?.value);
  const via = google && google.email === input.email ? google : null;
  const viaGoogle = via?.provider !== "microsoft" ? via : null;
  const viaMicrosoft = via?.provider === "microsoft" ? via : null;
  const mustVerify = !via && emailEnabled();
  if (mustVerify) {
    if (!input.code) {
      if (process.env.ALLOW_SIGNUP === "false") throw new ApiError(403, "New sign-ups are closed. Please contact VOXI for a demo.");
      if (!input.password) throw new ApiError(400, "Choose a password (at least 8 characters).");
      if (await db.staff.findUnique({ where: { email: input.email }, select: { id: true } }))
        throw new ApiError(409, "That email already has a VOXI account. Sign in instead, or use a different email.");
      await sendCode(input.email, "signup", input.firstName);
      return { needsCode: true, email: input.email };
    }
    await checkCode(input.email, "signup", input.code);
  }
  const session = await registerGym({
    gymName: input.gymName,
    ownerName: `${input.firstName} ${input.lastName}`.trim(),
    email: input.email,
    phone: input.phone,
    password: input.password ?? null,
    googleId: viaGoogle?.sub ?? null,
    microsoftId: viaMicrosoft?.sub ?? null,
    emailVerified: mustVerify || !!via,
    marketingOptIn: input.marketingOptIn,
  });
  if (google) store.delete(GOOGLE_SIGNUP_COOKIE);
  await setSessionCookie(session);
  await audit(session as typeof session & { gymId: string }, "settings.signup", "Gym", session.gymId, `Created the gym account (${viaGoogle ? "Google" : viaMicrosoft ? "Microsoft" : "email"} sign-up)`);
  return { user: session, home: "/dashboard?welcome=1" };
});
