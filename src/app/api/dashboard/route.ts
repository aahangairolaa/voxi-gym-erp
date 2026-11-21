import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getDashboard } from "@/server/services/dashboard.service";

/** GET /api/dashboard → KPIs, charts and lists for the home screen */
export const GET = route(async () => {
  const s = await requireGym("dashboard");
  return getDashboard(s.gymId);
});
