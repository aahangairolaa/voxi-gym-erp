import { route, searchParams, ApiError } from "@/server/http";
import { requireGym } from "@/server/auth";
import { addMonths, endOfDay, fromDateInput, startOfMonth, toDateInput } from "@/lib/dates";
import { exportCsv } from "@/server/services/reports.service";
import { audit } from "@/server/services/audit.service";

const TYPES = ["members", "payments", "attendance", "expenses"];

/** GET /api/reports/export?type=payments&from=&to= → CSV download (opens in Excel) */
export const GET = route(async (req) => {
  const s = await requireGym("reports");
  const q = searchParams(req);
  const type = q.get("type") ?? "";
  if (!TYPES.includes(type)) throw new ApiError(400, `type must be one of: ${TYPES.join(", ")}`);
  const from = q.get("from") ? fromDateInput(q.get("from")!) : startOfMonth(addMonths(new Date(), -5));
  const to = q.get("to") ? endOfDay(fromDateInput(q.get("to")!)) : endOfDay();
  const csv = await exportCsv(s.gymId, type, from, to);
  await audit(s, "report.export", null, null, `Exported ${type} to CSV`);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="voxi-${type}-${toDateInput()}.csv"`,
    },
  });
});
