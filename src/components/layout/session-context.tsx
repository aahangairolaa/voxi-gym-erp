"use client";
import { createContext, useContext } from "react";
import type { Role } from "@/lib/permissions";

export type CurrentUser = { staffId: string; name: string; email: string; role: Role; branchId: string | null; gymId: string | null };

/** The gym the signed-in person works at (null for VOXI admins). */
export type CurrentGym = {
  id: string;
  name: string;
  logo: string | null;
  brandColor: string | null;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED";
  plan: "ESSENTIAL" | "PROFESSIONAL" | "ELITE";
  whatsappEnabled: boolean;
} | null;

export type SessionValue = CurrentUser & { gym: CurrentGym };

export const SessionContext = createContext<SessionValue | null>(null);

/** The logged-in staff member:  const user = useUser(); user.role === "OWNER";  user.gym?.name */
export function useUser() {
  const u = useContext(SessionContext);
  if (!u) throw new Error("useUser must be used inside the app layout");
  return u;
}
