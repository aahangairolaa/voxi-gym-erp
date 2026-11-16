import bcrypt from "bcryptjs";
import { db } from "../db";
import { ApiError } from "../http";
import type { Session } from "../session-token";

export async function login(email: string, password: string): Promise<Session> {
  const staff = await db.staff.findUnique({ where: { email } });
  // Same message for "no such user" and "wrong password" so emails can't be guessed
  if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
    throw new ApiError(401, "Email or password is incorrect.");
  }
  if (!staff.isActive) throw new ApiError(403, "This account has been deactivated. Ask your manager.");
  await db.staff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
  return { staffId: staff.id, name: staff.name, email: staff.email, role: staff.role, branchId: staff.branchId };
}
