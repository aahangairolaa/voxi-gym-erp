"use client";
import { createContext, useContext } from "react";
import type { Role } from "@/lib/permissions";

export type CurrentUser = { staffId: string; name: string; email: string; role: Role; branchId: string | null };

export const SessionContext = createContext<CurrentUser | null>(null);

/** The logged-in staff member:  const user = useUser(); user.role === "OWNER" */
export function useUser() {
  const u = useContext(SessionContext);
  if (!u) throw new Error("useUser must be used inside the app layout");
  return u;
}
