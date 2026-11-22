import { route } from "@/server/http";
import { hasPermission, requireGym } from "@/server/auth";
import { getDashboard } from "@/server/services/dashboard.service";

/** GET /api/dashboard → KPIs, charts and lists for the home screen */
export const GET = route(async () => {
  const s = await requireGym("dashboard");
  const d = await getDashboard(s.gymId);
  if (await hasPermission(s, "revenue")) return d;
  // Roles without "Revenue figures" get the dashboard without money
  return { ...d, kpis: { ...d.kpis, revenueThisMonth: 0, revenueLastMonth: 0, revenueChange: null }, revenueByMonth: [], recentPayments: [] };
});
