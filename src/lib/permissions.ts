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
/** Areas the owner can switch on or off for every role (Settings → Roles and access). */
const SWITCHABLE: Role[] = ["OWNER", "MANAGER", "RECEPTION", "TRAINER"];

export const ACCESS: Record<Module, Role[]> = {
  dashboard: SWITCHABLE,
  members: SWITCHABLE,
  memberships: FRONT_DESK,
  plans: FRONT_DESK, // reception can view; editing is owner/manager only
  attendance: SWITCHABLE,
  biometric: SWITCHABLE,
  workouts: SWITCHABLE,
  classes: SWITCHABLE,
  leaderboard: GYM_FLOOR,
  pt: GYM_FLOOR, // trainers see only their own clients
  sales: SWITCHABLE,
  payments: SWITCHABLE,
  cash: SWITCHABLE,
  expenses: SWITCHABLE,
  cafe: FRONT_DESK, // the menu and café team: owner/manager; selling: front desk too
  reports: SWITCHABLE,
  leads: FRONT_DESK,
  messages: FRONT_DESK,
  staff: SWITCHABLE,
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

const ALL: Role[] = ["MANAGER", "RECEPTION", "TRAINER"];
/** Every switch can be set for every role; `defaults` is what a new gym starts with. */
export const PERMISSIONS: { key: PermissionKey; label: string; hint: string; roles: Role[]; defaults: Role[] }[] = [
  { key: "trainerDashboard", label: "Dashboard", hint: "The gym's dashboard (trainers always have their PT page)", roles: ALL, defaults: ["MANAGER", "RECEPTION", "TRAINER"] },
  { key: "revenue", label: "Revenue figures", hint: "Money totals on the dashboard", roles: ALL, defaults: ["MANAGER"] },
  { key: "trainerMembers", label: "Members list", hint: "Browse all members (PT clients are always on the PT page)", roles: ALL, defaults: ["MANAGER", "RECEPTION", "TRAINER"] },
  { key: "contacts", label: "Member phone and email", hint: "Hidden when off, so contacts can't be copied", roles: ALL, defaults: ["MANAGER", "RECEPTION", "TRAINER"] },
  { key: "trainerAttendance", label: "Attendance", hint: "Check members in and see who's inside", roles: ALL, defaults: ["MANAGER", "RECEPTION", "TRAINER"] },
  { key: "trainerClasses", label: "Classes", hint: "The class timetable", roles: ALL, defaults: ["MANAGER", "RECEPTION", "TRAINER"] },
  { key: "trainerWorkouts", label: "Workout plans", hint: "Build and assign workout plans", roles: ALL, defaults: ["MANAGER", "TRAINER"] },
  { key: "payments", label: "Payments, sales and cash drawer", hint: "Take payments, record sales, see invoices, open the drawer", roles: ALL, defaults: ["MANAGER", "RECEPTION"] },
  { key: "refunds", label: "Refunds and deletions", hint: "Refund payments and delete members", roles: ALL, defaults: ["MANAGER"] },
  { key: "reports", label: "Reports and exports", hint: "Financial reports and Excel downloads", roles: ALL, defaults: ["MANAGER"] },
  { key: "expenses", label: "Expenses", hint: "Record and view gym expenses", roles: ALL, defaults: ["MANAGER"] },
  { key: "staff", label: "Team management", hint: "Add and edit reception, trainers and housekeeping (never owners, managers or salaries)", roles: ALL, defaults: ["MANAGER"] },
  { key: "biometric", label: "Biometric devices", hint: "Connect devices and see the scan log", roles: ALL, defaults: ["MANAGER"] },
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

/** The page each role lands on after signing in: the dashboard, or the first area they're allowed into. */
export function homeFor(role: Role, perms?: RolePermissions | null): string {
  if (role === "SUPER_ADMIN") return "/admin";
  if (can(role, "dashboard", perms)) return "/dashboard";
  for (const m of ["pt", "attendance", "members", "sales", "classes", "workouts", "leads"] as Module[]) {
    if (can(role, m, perms)) return PATH_MODULE.find(([, mod]) => mod === m)![0];
  }
  return "/settings";
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
