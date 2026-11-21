import bcrypt from "bcryptjs";
import { db } from "../db";
import { ApiError } from "../http";
import type { Session } from "../session-token";

export async function login(email: string, password: string): Promise<Session> {
  const staff = await db.staff.findUnique({ where: { email }, include: { gym: { select: { status: true } } } });
  // Same message for "no such user" and "wrong password" so emails can't be guessed
  if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
    throw new ApiError(401, "Email or password is incorrect.");
  }
  if (!staff.isActive) throw new ApiError(403, "This account has been deactivated. Ask your manager.");
  if (staff.role !== "SUPER_ADMIN" && !staff.gymId) throw new ApiError(403, "This account isn't attached to a gym.");
  if (staff.gym?.status === "SUSPENDED") throw new ApiError(403, "Your gym's VOXI account is suspended. Please contact VOXI.");
  await db.staff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
  return {
    staffId: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    gymId: staff.role === "SUPER_ADMIN" ? null : staff.gymId,
    branchId: staff.branchId,
  };
}

/** What the app shell needs: the user plus their gym's name & branding. */
export async function currentUser(session: Session) {
  const gym = session.gymId
    ? await db.gym.findUnique({
        where: { id: session.gymId },
        select: { id: true, name: true, logo: true, brandColor: true, status: true, plan: true, whatsappEnabled: true },
      })
    : null;
  return { user: session, gym };
}
