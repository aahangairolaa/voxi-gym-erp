/**
 * Server-side session helpers used inside API routes.
 *   const s = await requireGym("payments");   // signed in, allowed, and works at a gym
 *   db.payment.findMany({ where: { gymId: s.gymId } })   ← ALWAYS filter by s.gymId
 */
import { cookies } from "next/headers";
import { can, type Module, type Role } from "@/lib/permissions";
import { db } from "./db";
import { ApiError } from "./http";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession, type Session } from "./session-token";

export type { Session };
/** A session that is guaranteed to belong to a gym. */
export type GymSession = Session & { gymId: string };

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
  const access = await stillAllowed(session);
  if (access !== "ok") {
    throw new ApiError(
      401,
      access === "signed-out" ? "You were signed out. Please sign in again." : "Your access has been paused. Please contact your gym owner or VOXI.",
    );
  }
  return session;
}

/**
 * Is this account still allowed in? (not deactivated, gym not suspended, and
 * not signed out everywhere since this token was issued). Checked on every
 * request, cached for 30 seconds per account so it costs almost nothing.
 */
const accessCache = new Map<string, { row: { isActive: boolean; sessionVersion: number; suspended: boolean } | null; at: number }>();
async function stillAllowed(session: Session): Promise<"ok" | "paused" | "signed-out"> {
  let hit = accessCache.get(session.staffId);
  if (!hit || Date.now() - hit.at > 30_000) {
    const r = await db.staff.findUnique({
      where: { id: session.staffId },
      select: { isActive: true, sessionVersion: true, gym: { select: { status: true } } },
    });
    hit = { row: r ? { isActive: r.isActive, sessionVersion: r.sessionVersion, suspended: r.gym?.status === "SUSPENDED" } : null, at: Date.now() };
    accessCache.set(session.staffId, hit);
  }
  if (!hit.row) return "signed-out";
  if ((session.v ?? 0) < hit.row.sessionVersion) return "signed-out";
  if (!hit.row.isActive || hit.row.suspended) return "paused";
  return "ok";
}

/** Forget the cached access check (after deactivating someone or "sign out everywhere"). */
export function forgetAccess(staffId: string) {
  accessCache.delete(staffId);
}

/** Signed in, allowed to use `module` (if given), and attached to a gym. */
export async function requireGym(module?: Module): Promise<GymSession> {
  const session = await requireSession(module);
  if (!session.gymId) throw new ApiError(403, "This area belongs to a gym. VOXI admins manage gyms from the Admin page.");
  return session as GymSession;
}

/** Like requireGym, but only for the listed roles. */
export async function requireGymRole(...roles: Role[]): Promise<GymSession> {
  const session = await requireGym();
  if (!roles.includes(session.role)) throw new ApiError(403, "Your role can't perform this action.");
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
