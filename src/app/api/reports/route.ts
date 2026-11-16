import { route, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { addMonths, endOfDay, fromDateInput, startOfMonth } from "@/lib/dates";
import { getReport } from "@/server/services/reports.service";

/** GET /api/reports?from=2026-01-01&to=2026-11-30  (defaults: last 6 months) */
export const GET = route(async (req) => {
  await requireSession("reports");
  const q = searchParams(req);
  const from = q.get("from") ? fromDateInput(q.get("from")!) : startOfMonth(addMonths(new Date(), -5));
  const to = q.get("to") ? endOfDay(fromDateInput(q.get("to")!)) : endOfDay();
  return getReport(from, to);
});
