/**
 * Runs before every page load. If you're not logged in and try to open an
 * app page (e.g. /dashboard), you're sent to /login.
 * API routes check permissions themselves (see src/server/auth.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/server/session-token";
import { homeFor } from "@/lib/permissions";

const PUBLIC_PAGES = ["/", "/pricing", "/login", "/register", "/forgot-password", "/reset-password", "/privacy", "/terms", "/help"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if ((pathname === "/login" || pathname === "/register") && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  // Public: marketing pages, login, and digital member cards (/c/<token>)
  if (PUBLIC_PAGES.includes(pathname) || pathname.startsWith("/c/")) return NextResponse.next();

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip API routes, device endpoints, Next.js internals and files with an extension (images, icons…)
  matcher: ["/((?!api|iclock|_next|.*\\..*).*)"],
};
