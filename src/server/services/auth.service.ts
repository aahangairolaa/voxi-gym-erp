import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";
import { sendEmail, emailEnabled } from "../email";
import { ApiError } from "../http";
import type { Session } from "../session-token";
import { createGym } from "./admin.service";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
/** Marks accounts created with Google that have no password yet (bcrypt never matches it). */
export const NO_PASSWORD = "!no-password";

type StaffForSession = {
  id: string;
  name: string;
  email: string;
  role: Session["role"];
  gymId: string | null;
  branchId: string | null;
  sessionVersion: number;
};

export function sessionFor(staff: StaffForSession): Session {
  return {
    staffId: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    gymId: staff.role === "SUPER_ADMIN" ? null : staff.gymId,
    branchId: staff.branchId,
    v: staff.sessionVersion,
  };
}

/** Throws a friendly error if this account may not sign in right now. */
function assertCanSignIn(staff: { isActive: boolean; role: string; gymId: string | null; gym: { status: string } | null }) {
  if (!staff.isActive) throw new ApiError(403, "This account has been deactivated. Ask your manager.");
  if (staff.role !== "SUPER_ADMIN" && !staff.gymId) throw new ApiError(403, "This account isn't attached to a gym.");
  if (staff.gym?.status === "SUSPENDED") throw new ApiError(403, "Your gym's VOXI account is suspended. Please contact VOXI.");
}

export async function login(email: string, password: string): Promise<Session> {
  const staff = await db.staff.findUnique({ where: { email }, include: { gym: { select: { status: true } } } });
  if (staff?.lockedUntil && staff.lockedUntil > new Date()) {
    const mins = Math.ceil((staff.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new ApiError(429, `Too many wrong passwords. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or reset your password.`);
  }
  // Same message for "no such user" and "wrong password" so emails can't be guessed
  if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
    if (staff) {
      const failed = staff.failedLogins + 1;
      await db.staff.update({
        where: { id: staff.id },
        data: failed >= MAX_FAILED ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: failed },
      });
      if (failed >= MAX_FAILED) throw new ApiError(429, `Too many wrong passwords. This account is locked for ${LOCK_MINUTES} minutes.`);
    }
    throw new ApiError(401, staff?.passwordHash === NO_PASSWORD ? "This account uses Google sign-in. Click “Continue with Google”." : "Email or password is incorrect.");
  }
  assertCanSignIn(staff);
  await db.staff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null } });
  return sessionFor(staff);
}

/** Google sign-in: find the account by Google id or (verified) email and link it. Null = no account yet. */
export async function loginWithGoogle(profile: { sub: string; email: string }): Promise<Session | null> {
  const staff =
    (await db.staff.findUnique({ where: { googleId: profile.sub }, include: { gym: { select: { status: true } } } })) ??
    (await db.staff.findUnique({ where: { email: profile.email }, include: { gym: { select: { status: true } } } }));
  if (!staff) return null;
  assertCanSignIn(staff);
  await db.staff.update({
    where: { id: staff.id },
    data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null, ...(staff.googleId ? {} : { googleId: profile.sub }) },
  });
  return sessionFor(staff);
}

/** Self-service sign-up: a new gym on a 14-day trial, its owner account, and starter data. */
export async function registerGym(input: {
  gymName: string;
  ownerName: string;
  email: string;
  phone: string | null;
  password: string | null;
  googleId: string | null;
}): Promise<Session> {
  if (process.env.ALLOW_SIGNUP === "false") throw new ApiError(403, "New sign-ups are closed. Please contact VOXI for a demo.");
  if (!input.password && !input.googleId) throw new ApiError(400, "Choose a password (at least 8 characters).");
  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : NO_PASSWORD;
  const gym = await createGym({
    name: input.gymName,
    slug: null,
    phone: input.phone,
    email: input.email,
    address: null,
    branchName: "Main branch",
    plan: "PROFESSIONAL",
    status: "TRIAL",
    trialDays: 14,
    ownerName: input.ownerName,
    ownerEmail: input.email,
    ownerPasswordHash: passwordHash,
    ownerGoogleId: input.googleId,
  });
  const owner = await db.staff.findUniqueOrThrow({ where: { email: gym.ownerEmail } });
  await db.staff.update({ where: { id: owner.id }, data: { lastLoginAt: new Date() } });
  return sessionFor(owner);
}

// ── Forgot / reset password ─────────────────────────────────────────────────
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Always answers the same way, so nobody can find out which emails have accounts. */
export async function requestPasswordReset(email: string, origin: string) {
  if (!emailEnabled()) return { emailEnabled: false };
  const staff = await db.staff.findUnique({ where: { email }, select: { id: true, name: true, email: true, isActive: true } });
  if (staff?.isActive) {
    const recent = await db.passwordReset.count({ where: { staffId: staff.id, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } });
    if (recent < 3) {
      const token = randomBytes(32).toString("base64url");
      await db.passwordReset.create({ data: { staffId: staff.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
      const link = `${origin}/reset-password?token=${token}`;
      await sendEmail({
        to: staff.email,
        subject: "Reset your VOXI password",
        text: `Hi ${staff.name.split(" ")[0]},\n\nSomeone (hopefully you) asked to reset your VOXI password. Open this link within 1 hour to choose a new one:\n\n${link}\n\nIf it wasn't you, you can ignore this email — your password stays the same.\n\n— VOXI`,
      });
    }
  }
  return { emailEnabled: true };
}

export async function resetPassword(token: string, password: string) {
  const row = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new ApiError(400, "This reset link has expired or was already used. Ask for a new one.");
  await db.$transaction([
    db.staff.update({
      where: { id: row.staffId },
      data: { passwordHash: await bcrypt.hash(password, 10), failedLogins: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
    }),
    db.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true };
}

/** Sign this person out on every device; returns a fresh session for the current device. */
export async function signOutEverywhere(session: Session): Promise<Session> {
  const staff = await db.staff.update({ where: { id: session.staffId }, data: { sessionVersion: { increment: 1 } } });
  return sessionFor(staff);
}

/** What the app shell needs: the user plus their gym's name & branding. */
export async function currentUser(session: Session) {
  const [gym, me] = await Promise.all([
    session.gymId
      ? db.gym.findUnique({
          where: { id: session.gymId },
          select: { id: true, name: true, logo: true, brandColor: true, status: true, plan: true, whatsappEnabled: true, trialEndsAt: true },
        })
      : null,
    db.staff.findUnique({ where: { id: session.staffId }, select: { googleId: true, passwordHash: true } }),
  ]);
  return {
    user: { ...session, hasGoogle: !!me?.googleId, hasPassword: me?.passwordHash !== NO_PASSWORD },
    gym,
    googleEnabled: googleEnabled(),
  };
}

export function googleEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
