import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/server/http";
import { GOOGLE_SIGNUP_COOKIE, OAUTH_COOKIE, appOrigin, exchangeCode, signSignup } from "@/server/google";
import { SESSION_COOKIE, SESSION_HOURS, signSession } from "@/server/session-token";
import { loginWithGoogle } from "@/server/services/auth.service";
import { homeFor } from "@/lib/permissions";

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** Google sends the browser back here after the person picks an account. */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  const fail = (code: string) => {
    const r = NextResponse.redirect(`${origin}/login?error=${code}`);
    r.cookies.delete(OAUTH_COOKIE);
    return r;
  };
  const q = req.nextUrl.searchParams;
  const [state, intent] = (req.cookies.get(OAUTH_COOKIE)?.value ?? "").split(".");
  if (q.get("error")) return fail("google_cancelled");
  if (!state || state !== q.get("state") || !q.get("code")) return fail("google_state");

  try {
    const profile = await exchangeCode(q.get("code")!, origin);
    const session = await loginWithGoogle(profile);
    if (session) {
      const res = NextResponse.redirect(`${origin}${homeFor(session.role)}`);
      res.cookies.set(SESSION_COOKIE, await signSession(session), { ...cookieBase, maxAge: SESSION_HOURS * 3600 });
      res.cookies.delete(OAUTH_COOKIE);
      return res;
    }
    // No VOXI account with this Google email yet → finish signing up
    const res = NextResponse.redirect(`${origin}/register?google=1${intent === "login" ? "&from=login" : ""}`);
    res.cookies.set(GOOGLE_SIGNUP_COOKIE, await signSignup(profile), { ...cookieBase, maxAge: 1200 });
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  } catch (e) {
    if (e instanceof ApiError) return fail(e.status === 403 ? "account_paused" : "google_failed");
    console.error("[google sign-in]", e);
    return fail("google_failed");
  }
}
