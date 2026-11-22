/**
 * Sidebar menu. Add a page here and it appears in the sidebar
 * for every role allowed by src/lib/permissions.ts.
 */
import type { IconType } from "react-icons";
import {
  LuLayoutDashboard, LuUsers, LuIdCard, LuClipboardList, LuUserPlus, LuScanFace, LuFingerprint, LuDumbbell,
  LuCalendarDays, LuTrophy, LuReceipt, LuBanknote, LuWallet, LuChartColumn, LuUserCog, LuSettings,
  LuMessageCircle, LuHistory, LuBuilding2, LuCreditCard, LuCoffee,
} from "react-icons/lu";
import type { Module } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: IconType; module: Module };
export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    title: "VOXI Platform",
    items: [{ href: "/admin", label: "Gyms", icon: LuBuilding2, module: "admin" }],
  },
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
      { href: "/leaderboard", label: "Leaderboard", icon: LuTrophy, module: "leaderboard" },
    ],
  },
  {
    title: "Business",
    items: [
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
