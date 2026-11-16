import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { getDashboard } from "@/server/services/dashboard.service";

/** GET /api/dashboard → KPIs, charts and lists for the home screen */
export const GET = route(async () => {
  await requireSession("dashboard");
  return getDashboard();
});
