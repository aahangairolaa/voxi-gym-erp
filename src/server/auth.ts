/**
 * Server-side session helpers used inside API routes.
 *   const s = await requireGym("payments");   // signed in, allowed, and works at a gym
 *   db.payment.findMany({ where: { gymId: s.gymId } })   ← ALWAYS filter by s.gymId
 */
import { cookies } from "next/headers";
import { allowed, can, type Module, type PermissionKey, type Role, type RolePermissions } from "@/lib/permissions";
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

/** Areas a gym can still reach once its free trial has ended (everything else is locked). */
const OPEN_WHEN_LOCKED: (Module | undefined)[] = ["billing", "settings"];

export async function requireSession(module?: Module, opts: { allowLocked?: boolean } = {}): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Please sign in again.");
  if (module && !can(session.role, module)) {
    // Quick reject for areas a role can never reach (before touching the database)
    if (!can(session.role, module, ALL_ON)) throw new ApiError(403, "Your role doesn't have access to this area.");
  }
  const access = await stillAllowed(session);
  if (access.state !== "ok") {
    throw new ApiError(
      401,
      access.state === "signed-out" ? "You were signed out. Please sign in again." : "Your access has been paused. Please contact your gym owner or VOXI.",
    );
  }
  if (module && !can(session.role, module, access.perms)) {
    throw new ApiError(403, "Your gym owner hasn't given your role access to this area.");
  }
  // Generic look-ups (no module) stay open so the Billing page can load; everything else locks.
  const open = module ? OPEN_WHEN_LOCKED.includes(module) : opts.allowLocked !== false;
  if (access.trialEnded && !open) {
    throw new ApiError(402, "Your free trial has ended. Choose a plan on the Billing page to keep using VOXI.");
  }
  return session;
}

/** Every confidential permission switched on (used to tell "never allowed" from "switched off"). */
const ALL_ON: RolePermissions = { MANAGER: allOn(), RECEPTION: allOn(), TRAINER: allOn() };
function allOn() {
  return { payments: true, revenue: true, reports: true, expenses: true, refunds: true, contacts: true, staff: true, biometric: true };
}

/**
 * Is this account still allowed in? (not deactivated, gym not suspended, and
 * not signed out everywhere since this token was issued). Checked on every
 * request, cached for 30 seconds per account so it costs almost nothing.
 * Also returns the gym's role permissions and whether its free trial has ended.
 */
type AccessRow = { isActive: boolean; sessionVersion: number; suspended: boolean; trialEndsAt: number | null; perms: RolePermissions | null };
const accessCache = new Map<string, { row: AccessRow | null; at: number }>();
async function stillAllowed(session: Session): Promise<{ state: "ok" | "paused" | "signed-out"; perms: RolePermissions | null; trialEnded: boolean }> {
  let hit = accessCache.get(session.staffId);
  if (!hit || Date.now() - hit.at > 30_000) {
    const r = await db.staff.findUnique({
      where: { id: session.staffId },
      select: { isActive: true, sessionVersion: true, gym: { select: { status: true, trialEndsAt: true, rolePermissions: true } } },
    });
    hit = {
      row: r
        ? {
            isActive: r.isActive,
            sessionVersion: r.sessionVersion,
            suspended: r.gym?.status === "SUSPENDED",
            trialEndsAt: r.gym?.status === "TRIAL" && r.gym.trialEndsAt ? r.gym.trialEndsAt.getTime() : null,
            perms: (r.gym?.rolePermissions as RolePermissions | null) ?? null,
          }
        : null,
      at: Date.now(),
    };
    accessCache.set(session.staffId, hit);
  }
  const row = hit.row;
  if (!row) return { state: "signed-out", perms: null, trialEnded: false };
  if ((session.v ?? 0) < row.sessionVersion) return { state: "signed-out", perms: null, trialEnded: false };
  if (!row.isActive || row.suspended) return { state: "paused", perms: null, trialEnded: false };
  return { state: "ok", perms: row.perms, trialEnded: row.trialEndsAt !== null && row.trialEndsAt <= Date.now() };
}

/** The gym's role permissions for this session (cached with the access check). */
export async function sessionPermissions(session: Session): Promise<RolePermissions | null> {
  return (await stillAllowed(session)).perms;
}

/** Throw 403 unless this person's role has a confidential permission. */
export async function requirePermission(session: Session, key: PermissionKey) {
  if (!allowed(session.role, key, await sessionPermissions(session))) {
    throw new ApiError(403, "Your gym owner hasn't given your role access to this.");
  }
}

/** Does this person's role have a confidential permission? */
export async function hasPermission(session: Session, key: PermissionKey) {
  return allowed(session.role, key, await sessionPermissions(session));
}

/** Forget the cached access check (after deactivating someone or "sign out everywhere"). */
export function forgetAccess(staffId?: string) {
  if (staffId) accessCache.delete(staffId);
  else accessCache.clear(); // e.g. after the owner changes role permissions or a plan is activated
}

/** Signed in, allowed to use `module` (if given), and attached to a gym. */
export async function requireGym(module?: Module, opts: { allowLocked?: boolean } = {}): Promise<GymSession> {
  const session = await requireSession(module, opts);
  if (!session.gymId) throw new ApiError(403, "This area belongs to a gym. VOXI admins manage gyms from the Admin page.");
  return session as GymSession;
}

/** Like requireGym, but only for the listed roles. */
export async function requireGymRole(...roles: Role[]): Promise<GymSession> {
  const session = await requireGym(undefined, { allowLocked: false });
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
