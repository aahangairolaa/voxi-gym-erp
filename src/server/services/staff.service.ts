import bcrypt from "bcryptjs";
import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { Session } from "../session-token";
import type { staffSchema } from "../validators";

type StaffInput = z.infer<typeof staffSchema>;

const safeSelect = {
  id: true, name: true, email: true, phone: true, role: true, branchId: true, salary: true,
  specialty: true, isActive: true, lastLoginAt: true, createdAt: true,
  branch: { select: { id: true, name: true } },
} as const;

/** Managers may only manage reception & trainers; the owner can manage everyone. */
function assertCanManage(session: Session, targetRole: string) {
  if (session.role === "OWNER") return;
  if (session.role === "MANAGER" && (targetRole === "RECEPTION" || targetRole === "TRAINER")) return;
  throw new ApiError(403, "Only the owner can manage owner and manager accounts.");
}

export async function listStaff(session: Session) {
  const staff = await db.staff.findMany({ orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }], select: safeSelect });
  // Only the owner sees salaries
  return session.role === "OWNER" ? staff : staff.map((s) => ({ ...s, salary: null }));
}

export async function listTrainers() {
  return db.staff.findMany({ where: { role: "TRAINER", isActive: true }, select: { id: true, name: true, specialty: true } });
}

export async function createStaff(input: StaffInput, session: Session) {
  assertCanManage(session, input.role);
  const { password, ...data } = input;
  if (!password) throw new ApiError(400, "Set a password for the new account (min 8 characters).");
  return db.staff.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) }, select: safeSelect });
}

export async function updateStaff(id: string, input: StaffInput, session: Session) {
  const existing = await db.staff.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Staff member not found.");
  assertCanManage(session, existing.role);
  assertCanManage(session, input.role);
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
