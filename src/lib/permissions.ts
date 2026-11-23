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
  | "pt"
  | "sales"
  | "payments"
  | "cash"
  | "expenses"
  | "cafe"
  | "reports"
  | "leads"
  | "messages"
  | "staff"
  | "activity"
  | "settings"
  | "billing"
  | "admin";

const GYM_FLOOR: Role[] = ["OWNER", "MANAGER", "RECEPTION", "TRAINER"];
const FRONT_DESK: Role[] = ["OWNER", "MANAGER", "RECEPTION"];
const MANAGEMENT: Role[] = ["OWNER", "MANAGER"];

/**
 * The most each role could ever reach. Modules marked with a key in MODULE_PERMISSION
 * are confidential: the gym owner switches them on or off per role (Settings → Roles and access).
 */
export const ACCESS: Record<Module, Role[]> = {
  dashboard: GYM_FLOOR,
  members: GYM_FLOOR,
  memberships: FRONT_DESK,
  plans: FRONT_DESK, // reception can view; editing is owner/manager only
  attendance: GYM_FLOOR,
  biometric: ["OWNER", "MANAGER", "RECEPTION"],
  workouts: ["OWNER", "MANAGER", "TRAINER"],
  classes: GYM_FLOOR,
  leaderboard: GYM_FLOOR,
  pt: GYM_FLOOR, // trainers see only their own clients
  sales: FRONT_DESK,
  payments: FRONT_DESK,
  cash: FRONT_DESK,
  expenses: FRONT_DESK,
  cafe: FRONT_DESK, // the menu and café team: owner/manager; selling: front desk too
  reports: FRONT_DESK,
  leads: FRONT_DESK,
  messages: FRONT_DESK,
  staff: MANAGEMENT,
  activity: ["OWNER"], // the owner only: who did what, including managers
  settings: ["OWNER"],
  billing: MANAGEMENT,
  admin: ["SUPER_ADMIN"],
};

// ── Confidential permissions the owner controls per role ─────────────────────
export type PermissionKey =
  | "payments" | "revenue" | "reports" | "expenses" | "refunds" | "contacts" | "staff" | "biometric"
  // What trainers see besides PT (switch off to keep them focused on their PT clients)
  | "trainerDashboard" | "trainerMembers" | "trainerAttendance" | "trainerClasses" | "trainerWorkouts";
/** Role → permission → on/off. Only differences from the defaults need to be stored. */
export type RolePermissions = Partial<Record<Role, Partial<Record<PermissionKey, boolean>>>>;

export const CONFIGURABLE_ROLES: Role[] = ["MANAGER", "RECEPTION", "TRAINER"];

export const PERMISSIONS: { key: PermissionKey; label: string; hint: string; roles: Role[]; defaults: Role[] }[] = [
  { key: "revenue", label: "Revenue figures", hint: "Money totals on the dashboard", roles: ["MANAGER", "RECEPTION"], defaults: ["MANAGER"] },
  { key: "payments", label: "Payments and cash drawer", hint: "Take payments, see invoices and open the drawer", roles: ["MANAGER", "RECEPTION"], defaults: ["MANAGER", "RECEPTION"] },
  { key: "refunds", label: "Refunds and deletions", hint: "Refund payments and delete members", roles: ["MANAGER", "RECEPTION"], defaults: ["MANAGER"] },
  { key: "reports", label: "Reports and exports", hint: "Financial reports and Excel downloads", roles: ["MANAGER", "RECEPTION"], defaults: ["MANAGER"] },
  { key: "expenses", label: "Expenses", hint: "Record and view gym expenses", roles: ["MANAGER", "RECEPTION"], defaults: ["MANAGER"] },
  { key: "contacts", label: "Member phone and email", hint: "Hidden when off, so contacts can't be copied", roles: ["MANAGER", "RECEPTION", "TRAINER"], defaults: ["MANAGER", "RECEPTION", "TRAINER"] },
  { key: "staff", label: "Team management", hint: "Add and edit staff (never owners or salaries)", roles: ["MANAGER"], defaults: ["MANAGER"] },
  { key: "biometric", label: "Biometric devices", hint: "Connect devices and see the scan log", roles: ["MANAGER", "RECEPTION"], defaults: ["MANAGER"] },
  { key: "trainerDashboard", label: "Dashboard", hint: "Trainers always have their PT page; switch these off to keep them focused on it", roles: ["TRAINER"], defaults: ["TRAINER"] },
  { key: "trainerMembers", label: "Members list", hint: "Browse all members (PT clients are always on their PT page)", roles: ["TRAINER"], defaults: ["TRAINER"] },
  { key: "trainerAttendance", label: "Attendance", hint: "Check members in and see who's inside", roles: ["TRAINER"], defaults: ["TRAINER"] },
  { key: "trainerClasses", label: "Classes", hint: "The class timetable", roles: ["TRAINER"], defaults: ["TRAINER"] },
  { key: "trainerWorkouts", label: "Workout plans", hint: "Build and assign workout plans", roles: ["TRAINER"], defaults: ["TRAINER"] },
];

/** Modules that are switched by a confidential permission. */
const MODULE_PERMISSION: Partial<Record<Module, PermissionKey>> = {
  dashboard: "trainerDashboard",
  members: "trainerMembers",
  attendance: "trainerAttendance",
  classes: "trainerClasses",
  workouts: "trainerWorkouts",
  sales: "payments",
  payments: "payments",
  cash: "payments",
  reports: "reports",
  expenses: "expenses",
  staff: "staff",
  biometric: "biometric",
};

/** Does this role have a confidential permission? The owner always does. */
export function allowed(role: Role | undefined | null, key: PermissionKey, perms?: RolePermissions | null) {
  if (!role) return false;
  if (role === "OWNER") return true;
  const p = PERMISSIONS.find((x) => x.key === key)!;
  if (!p.roles.includes(role)) return false;
  return perms?.[role]?.[key] ?? p.defaults.includes(role);
}

/** Can this role open a module? Pass the gym's permissions so the owner's choices apply. */
export function can(role: Role | undefined | null, module: Module, perms?: RolePermissions | null) {
  if (!role || !ACCESS[module].includes(role)) return false;
  const key = MODULE_PERMISSION[module];
  if (!key) return true;
  // A switch only applies to the roles it lists (e.g. the trainer switches never limit reception)
  const p = PERMISSIONS.find((x) => x.key === key)!;
  if (role !== "OWNER" && !p.roles.includes(role)) return true;
  return allowed(role, key, perms);
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
export function homeFor(role: Role, perms?: RolePermissions | null): string {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "TRAINER" && !can(role, "dashboard", perms)) return "/pt";
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
  ["/pt", "pt"],
  ["/sales", "sales"],
  ["/cafe", "cafe"],
  ["/payments", "payments"],
  ["/cash-sessions", "cash"],
  ["/expenses", "expenses"],
  ["/reports", "reports"],
  ["/messages", "messages"],
  ["/staff", "staff"],
  ["/activity", "activity"],
  ["/billing", "billing"],
  ["/admin", "admin"],
];

export function moduleForPath(pathname: string): Module | null {
  const hit = PATH_MODULE.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  return hit ? hit[1] : null;
}
