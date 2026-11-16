/**
 * Creating & reading login tokens (JWT stored in an httpOnly cookie).
 * This file must stay "edge-safe" (no Node-only imports) because the
 * middleware runs it on every request.
 */
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/permissions";

export const SESSION_COOKIE = "voxi_session";
export const SESSION_HOURS = 12;

export type Session = {
  staffId: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is missing or too short. Set it in your environment variables.");
    }
    return new TextEncoder().encode("voxi-dev-only-secret-change-me-please");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      staffId: String(payload.staffId),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as Role,
      branchId: (payload.branchId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
