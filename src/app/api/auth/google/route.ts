import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_COOKIE, appOrigin, googleAuthUrl } from "@/server/google";
import { googleEnabled } from "@/server/services/auth.service";

/** GET /api/auth/google?intent=login|register — sends the browser to Google's account chooser */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  if (!googleEnabled()) return NextResponse.redirect(`${origin}/login?error=google_off`);
  const intent = req.nextUrl.searchParams.get("intent") === "register" ? "register" : "login";
  const state = randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(googleAuthUrl(origin, state));
  res.cookies.set(OAUTH_COOKIE, `${state}.${intent}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
