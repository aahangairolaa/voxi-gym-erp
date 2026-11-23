/**
 * Sidebar menu. Add a page here and it appears in the sidebar
 * for every role allowed by src/lib/permissions.ts.
 */
import type { IconType } from "react-icons";
import {
  LuLayoutDashboard, LuUsers, LuIdCard, LuClipboardList, LuUserPlus, LuScanFace, LuFingerprint, LuDumbbell,
  LuCalendarDays, LuReceipt, LuBanknote, LuWallet, LuChartColumn, LuUserCog, LuSettings,
  LuMessageCircle, LuHistory, LuBuilding2, LuCreditCard, LuCoffee, LuTrendingUp, LuBicepsFlexed,
  LuBell, LuContact, LuTicket, LuMegaphone, LuDatabase, LuTrash2,
} from "react-icons/lu";
import type { Module } from "@/lib/permissions";

/** `exact`: only highlight on this exact page (e.g. a dashboard whose sections live under it). */
export type NavItem = { href: string; label: string; icon: IconType; module: Module; exact?: boolean };
export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  // ── VOXI team (platform admin) ──
  {
    title: "Platform",
    items: [{ href: "/admin", label: "Dashboard", icon: LuLayoutDashboard, module: "admin", exact: true }],
  },
  {
    title: "Gyms",
    items: [
      { href: "/admin/gyms", label: "All gyms", icon: LuBuilding2, module: "admin" },
      { href: "/admin/requests", label: "Plan requests", icon: LuBell, module: "admin" },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: LuCreditCard, module: "admin" },
      { href: "/admin/owners", label: "Gym owners", icon: LuContact, module: "admin" },
    ],
  },
  {
    title: "Grow",
    items: [
      { href: "/admin/promos", label: "Promo codes", icon: LuTicket, module: "admin" },
      { href: "/admin/announcements", label: "Announcements", icon: LuMegaphone, module: "admin" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/storage", label: "Storage", icon: LuDatabase, module: "admin" },
      { href: "/admin/activity", label: "Admin activity", icon: LuHistory, module: "admin" },
      { href: "/admin/deleted", label: "Deleted gyms", icon: LuTrash2, module: "admin" },
    ],
  },
  // ── Gym staff ──
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LuLayoutDashboard, module: "dashboard" }],
  },
  {
    title: "Members",
    items: [
      { href: "/members", label: "Members", icon: LuUsers, module: "members" },
      { href: "/memberships", label: "Memberships", icon: LuIdCard, module: "memberships" },
      { href: "/plans", label: "Plans", icon: LuClipboardList, module: "plans" },
      { href: "/leads", label: "Leads", icon: LuUserPlus, module: "leads" },
      { href: "/messages", label: "WhatsApp", icon: LuMessageCircle, module: "messages" },
    ],
  },
  {
    title: "Fitness",
    items: [
      { href: "/attendance", label: "Attendance", icon: LuScanFace, module: "attendance" },
      { href: "/biometric", label: "Biometric", icon: LuFingerprint, module: "biometric" },
      { href: "/workouts", label: "Workouts", icon: LuDumbbell, module: "workouts" },
      { href: "/classes", label: "Classes", icon: LuCalendarDays, module: "classes" },
      { href: "/pt", label: "Personal Training", icon: LuBicepsFlexed, module: "pt" },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/sales", label: "Sales", icon: LuTrendingUp, module: "sales" },
      { href: "/payments", label: "Payments", icon: LuReceipt, module: "payments" },
      { href: "/cash-sessions", label: "Cash Sessions", icon: LuBanknote, module: "cash" },
      { href: "/expenses", label: "Expenses", icon: LuWallet, module: "expenses" },
      { href: "/cafe", label: "Café", icon: LuCoffee, module: "cafe" },
      { href: "/reports", label: "Reports", icon: LuChartColumn, module: "reports" },
    ],
  },
  {
    title: "Management",
    items: [
      { href: "/staff", label: "Staff", icon: LuUserCog, module: "staff" },
      { href: "/activity", label: "Activity Log", icon: LuHistory, module: "activity" },
      { href: "/billing", label: "Billing", icon: LuCreditCard, module: "billing" },
      { href: "/settings", label: "Settings", icon: LuSettings, module: "settings" },
    ],
  },
];
