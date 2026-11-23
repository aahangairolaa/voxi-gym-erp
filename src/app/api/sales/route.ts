import { route, ApiError } from "@/server/http";
import { hasPermission, requireGym } from "@/server/auth";
import { fromDateInput } from "@/lib/dates";
import { salesReport, type Period } from "@/server/services/sales.service";

/**
 * GET /api/sales?period=day|month|year&date=2026-11-23 → everything sold in that day, month or year:
 * totals, by type, by payment method, new members by source, the staff sales board and every sale.
 * Roles without "Revenue figures" can see today and other single days only.
 */
export const GET = route(async (req) => {
  const s = await requireGym("sales");
  const p = req.nextUrl.searchParams.get("period");
  const period: Period = p === "month" || p === "year" ? p : "day";
  if (period !== "day" && !(await hasPermission(s, "revenue"))) {
    throw new ApiError(403, "Your gym owner hasn't given your role access to monthly and yearly revenue.");
  }
  const d = req.nextUrl.searchParams.get("date");
  const anchor = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? fromDateInput(d) : new Date();
  return salesReport(s.gymId, period, anchor);
});
