/**
 * Server-side session helpers used inside API routes.
 *   const session = await requireSession("payments");   // must be logged in AND allowed
 */
import { cookies } from "next/headers";
import { can, type Module, type Role } from "@/lib/permissions";
import { ApiError } from "./http";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession, type Session } from "./session-token";

export type { Session };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession(module?: Module): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Please sign in again.");
  if (module && !can(session.role, module)) {
    throw new ApiError(403, "Your role doesn't have access to this area.");
  }
  return session;
}

export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new ApiError(403, "Your role can't perform this action.");
  return session;
}

export async function setSessionCookie(session: Session) {
  const token = await signSession(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
