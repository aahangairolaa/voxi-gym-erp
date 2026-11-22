import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/server/http";
import { GOOGLE_SIGNUP_COOKIE, appOrigin, signSignup } from "@/server/google";
import { MS_OAUTH_COOKIE, exchangeMicrosoftCode } from "@/server/microsoft";
import { SESSION_COOKIE, SESSION_HOURS, signSession } from "@/server/session-token";
import { loginWithMicrosoft } from "@/server/services/auth.service";
import { homeFor } from "@/lib/permissions";

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** Microsoft sends the browser back here after the person picks an account. */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  const fail = (code: string) => {
    const r = NextResponse.redirect(`${origin}/login?error=${code}`);
    r.cookies.delete(MS_OAUTH_COOKIE);
    return r;
  };
  const q = req.nextUrl.searchParams;
  const [state, intent] = (req.cookies.get(MS_OAUTH_COOKIE)?.value ?? "").split(".");
  if (q.get("error")) return fail("microsoft_cancelled");
  if (!state || state !== q.get("state") || !q.get("code")) return fail("microsoft_state");

  try {
    const profile = await exchangeMicrosoftCode(q.get("code")!, origin);
    const session = await loginWithMicrosoft(profile);
    if (session) {
      const res = NextResponse.redirect(`${origin}${homeFor(session.role)}`);
      res.cookies.set(SESSION_COOKIE, await signSession(session), { ...cookieBase, maxAge: SESSION_HOURS * 3600 });
      res.cookies.delete(MS_OAUTH_COOKIE);
      return res;
    }
    // No VOXI account with this email yet → finish signing up (same screen as Google)
    const res = NextResponse.redirect(`${origin}/register?google=1${intent === "login" ? "&from=login" : ""}`);
    res.cookies.set(GOOGLE_SIGNUP_COOKIE, await signSignup(profile), { ...cookieBase, maxAge: 1200 });
    res.cookies.delete(MS_OAUTH_COOKIE);
    return res;
  } catch (e) {
    if (e instanceof ApiError) return fail(e.status === 403 ? "account_paused" : "microsoft_failed");
    console.error("[microsoft sign-in]", e);
    return fail("microsoft_failed");
  }
}
