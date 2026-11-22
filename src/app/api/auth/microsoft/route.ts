import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/server/google";
import { MS_OAUTH_COOKIE, microsoftAuthUrl, microsoftEnabled } from "@/server/microsoft";

/** GET /api/auth/microsoft?intent=login|register — sends the browser to Microsoft's account chooser */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  if (!microsoftEnabled()) return NextResponse.redirect(`${origin}/login?error=microsoft_off`);
  const intent = req.nextUrl.searchParams.get("intent") === "register" ? "register" : "login";
  const state = randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(microsoftAuthUrl(origin, state));
  res.cookies.set(MS_OAUTH_COOKIE, `${state}.${intent}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
