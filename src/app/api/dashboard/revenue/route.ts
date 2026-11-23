import { route, ApiError } from "@/server/http";
import { hasPermission, requireGym } from "@/server/auth";
import { salesTimeline, type Period } from "@/server/services/sales.service";

/** GET /api/dashboard/revenue?period=day|month|year → revenue over the last 30 days, 12 months or 5 years */
export const GET = route(async (req) => {
  const s = await requireGym("dashboard");
  if (!(await hasPermission(s, "revenue"))) throw new ApiError(403, "Your gym owner hasn't given your role access to revenue figures.");
  const p = req.nextUrl.searchParams.get("period");
  const period: Period = p === "day" || p === "year" ? p : "month";
  return salesTimeline(s.gymId, period);
});
