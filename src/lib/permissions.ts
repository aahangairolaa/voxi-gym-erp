/**
 * Who can use which part of VOXI.
 * Used by the sidebar (to hide links), the app shell (to redirect) AND the API
 * (to block requests), so there is exactly one place to change permissions.
 */
export type Role = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "RECEPTION" | "TRAINER" | "HOUSEKEEPING";

/** Roles a gym can give its own staff (SUPER_ADMIN is the VOXI team only). */
export const GYM_ROLES: Role[] = ["OWNER", "MANAGER", "RECEPTION", "TRAINER", "HOUSEKEEPING"];
export const ROLES = GYM_ROLES;

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
  | "messages"
  | "staff"
  | "activity"
  | "settings"
  | "admin";

const GYM_FLOOR: Role[] = ["OWNER", "MANAGER", "RECEPTION", "TRAINER"];
const FRONT_DESK: Role[] = ["OWNER", "MANAGER", "RECEPTION"];
const MANAGEMENT: Role[] = ["OWNER", "MANAGER"];

export const ACCESS: Record<Module, Role[]> = {
  dashboard: GYM_FLOOR,
  members: GYM_FLOOR,
  memberships: FRONT_DESK,
  plans: FRONT_DESK, // reception can view; editing is owner/manager only
  attendance: GYM_FLOOR,
  biometric: MANAGEMENT,
  workouts: ["OWNER", "MANAGER", "TRAINER"],
  classes: GYM_FLOOR,
  leaderboard: GYM_FLOOR,
  payments: FRONT_DESK,
  cash: FRONT_DESK,
  expenses: MANAGEMENT,
  reports: MANAGEMENT,
  leads: FRONT_DESK,
  messages: FRONT_DESK,
  staff: MANAGEMENT,
  activity: MANAGEMENT,
  settings: ["OWNER"],
  admin: ["SUPER_ADMIN"],
};

export function can(role: Role | undefined | null, module: Module) {
  return !!role && ACCESS[module].includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "VOXI Admin",
  OWNER: "Owner",
  MANAGER: "Manager",
  RECEPTION: "Reception",
  TRAINER: "Trainer",
  HOUSEKEEPING: "Housekeeping",
};

/** The page each role lands on after signing in. */
export function homeFor(role: Role): string {
  if (role === "SUPER_ADMIN") return "/admin";
  return "/dashboard";
}

/** Which module a URL belongs to (for redirecting people away from pages they can't use). */
export const PATH_MODULE: [string, Module][] = [
  ["/dashboard", "dashboard"],
  ["/members", "members"],
  ["/memberships", "memberships"],
  ["/plans", "plans"],
  ["/leads", "leads"],
  ["/attendance", "attendance"],
  ["/biometric", "biometric"],
  ["/workouts", "workouts"],
  ["/classes", "classes"],
  ["/leaderboard", "leaderboard"],
  ["/payments", "payments"],
  ["/cash-sessions", "cash"],
  ["/expenses", "expenses"],
  ["/reports", "reports"],
  ["/messages", "messages"],
  ["/staff", "staff"],
  ["/activity", "activity"],
  ["/admin", "admin"],
];

export function moduleForPath(pathname: string): Module | null {
  const hit = PATH_MODULE.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  return hit ? hit[1] : null;
}
