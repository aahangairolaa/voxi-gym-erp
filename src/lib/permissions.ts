/**
 * Who can use which part of VOXI.
 * Used by the sidebar (to hide links) AND by the API (to block requests),
 * so there is exactly one place to change permissions.
 */
export type Role = "OWNER" | "MANAGER" | "RECEPTION" | "TRAINER";

export const ROLES: Role[] = ["OWNER", "MANAGER", "RECEPTION", "TRAINER"];

export type Module =
  | "dashboard"
  | "members"
  | "memberships"
  | "plans"
  | "attendance"
  | "biometric"
  | "workouts"
  | "classes"
  | "leaderboard"
  | "payments"
  | "cash"
  | "expenses"
  | "reports"
  | "leads"
  | "staff"
  | "settings";

const ALL: Role[] = ["OWNER", "MANAGER", "RECEPTION", "TRAINER"];
const FRONT_DESK: Role[] = ["OWNER", "MANAGER", "RECEPTION"];
const MANAGEMENT: Role[] = ["OWNER", "MANAGER"];

export const ACCESS: Record<Module, Role[]> = {
  dashboard: ALL,
  members: ALL,
  memberships: FRONT_DESK,
  plans: FRONT_DESK, // reception can view; editing is checked separately (canEditPlans)
  attendance: ALL,
  biometric: MANAGEMENT,
  workouts: ["OWNER", "MANAGER", "TRAINER"],
  classes: ALL,
  leaderboard: ALL,
  payments: FRONT_DESK,
  cash: FRONT_DESK,
  expenses: MANAGEMENT,
  reports: MANAGEMENT,
  leads: FRONT_DESK,
  staff: MANAGEMENT,
  settings: ["OWNER"],
};

export function can(role: Role | undefined | null, module: Module) {
  return !!role && ACCESS[module].includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  RECEPTION: "Reception",
  TRAINER: "Trainer",
};
