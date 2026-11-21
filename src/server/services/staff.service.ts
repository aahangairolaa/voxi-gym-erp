import bcrypt from "bcryptjs";
import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession, Session } from "../auth";
import type { staffSchema } from "../validators";
import { ownedOr404 } from "./_shared";

type StaffInput = z.infer<typeof staffSchema>;

const safeSelect = {
  id: true, name: true, email: true, phone: true, role: true, branchId: true, salary: true,
  specialty: true, isActive: true, lastLoginAt: true, createdAt: true,
  branch: { select: { id: true, name: true } },
} as const;

/** Managers may only manage reception, trainers & housekeeping; the owner can manage everyone. */
function assertCanManage(session: Session, targetRole: string) {
  if (targetRole === "SUPER_ADMIN") throw new ApiError(403, "That role is reserved for the VOXI team.");
  if (session.role === "OWNER") return;
  if (session.role === "MANAGER" && ["RECEPTION", "TRAINER", "HOUSEKEEPING"].includes(targetRole)) return;
  throw new ApiError(403, "Only the owner can manage owner and manager accounts.");
}

async function checkBranch(gymId: string, branchId: string | null | undefined) {
  if (branchId) ownedOr404(await db.branch.findFirst({ where: { id: branchId, gymId }, select: { id: true } }), "Branch");
}

export async function listStaff(session: GymSession) {
  const staff = await db.staff.findMany({
    where: { gymId: session.gymId },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: safeSelect,
  });
  // Only the owner sees salaries
  return session.role === "OWNER" ? staff : staff.map((s) => ({ ...s, salary: null }));
}

export async function listTrainers(gymId: string) {
  return db.staff.findMany({ where: { gymId, role: "TRAINER", isActive: true }, select: { id: true, name: true, specialty: true } });
}

/** Active staff for "assign to" dropdowns (housekeeping, leads …). */
export async function listAssignable(gymId: string, role?: string | null) {
  return db.staff.findMany({
    where: { gymId, isActive: true, ...(role ? { role: role as never } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}

export async function createStaff(input: StaffInput, session: GymSession) {
  assertCanManage(session, input.role);
  await checkBranch(session.gymId, input.branchId);
  const { password, ...data } = input;
  if (!password) throw new ApiError(400, "Set a password for the new account (min 8 characters).");
  return db.staff.create({
    data: { ...data, gymId: session.gymId, passwordHash: await bcrypt.hash(password, 10) },
    select: safeSelect,
  });
}

export async function updateStaff(id: string, input: StaffInput, session: GymSession) {
  const existing = ownedOr404(await db.staff.findFirst({ where: { id, gymId: session.gymId } }), "Staff member");
  assertCanManage(session, existing.role);
  assertCanManage(session, input.role);
  await checkBranch(session.gymId, input.branchId);
  if (id === session.staffId && (!input.isActive || input.role !== existing.role)) {
    throw new ApiError(400, "You can't deactivate yourself or change your own role.");
  }
  const { password, ...data } = input;
  return db.staff.update({
    where: { id },
    data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
    select: safeSelect,
  });
}

export async function changeOwnPassword(session: Session, currentPassword: string, newPassword: string) {
  const me = await db.staff.findUnique({ where: { id: session.staffId } });
  if (!me || !(await bcrypt.compare(currentPassword, me.passwordHash))) throw new ApiError(400, "Current password is incorrect.");
  await db.staff.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  return { ok: true };
}
