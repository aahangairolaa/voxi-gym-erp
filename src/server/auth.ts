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
  return session;
}

/**
 * Is this account still allowed in? (staff not deactivated, gym not suspended)
 * Checked on every gym request, cached for 30 seconds so it costs almost nothing.
 */
const accessCache = new Map<string, { ok: boolean; at: number }>();
async function stillAllowed(staffId: string) {
  const hit = accessCache.get(staffId);
  if (hit && Date.now() - hit.at < 30_000) return hit.ok;
  const row = await db.staff.findUnique({ where: { id: staffId }, select: { isActive: true, gym: { select: { status: true } } } });
  const ok = !!row?.isActive && row.gym?.status !== "SUSPENDED";
  accessCache.set(staffId, { ok, at: Date.now() });
  return ok;
}

/** Signed in, allowed to use `module` (if given), and attached to a gym. */
export async function requireGym(module?: Module): Promise<GymSession> {
  const session = await requireSession(module);
  if (!session.gymId) throw new ApiError(403, "This area belongs to a gym. VOXI admins manage gyms from the Admin page.");
  if (!(await stillAllowed(session.staffId))) {
    throw new ApiError(401, "Your access to this gym has been paused. Please contact your gym owner or VOXI.");
  }
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
