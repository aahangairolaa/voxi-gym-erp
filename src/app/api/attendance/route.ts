import { route, readBody, searchParams, ApiError } from "@/server/http";
import { requireSession } from "@/server/auth";
import { fromDateInput } from "@/lib/dates";
import { checkInSchema } from "@/server/validators";
import { findMemberForCheckIn, listAttendance, recordAccess } from "@/server/services/attendance.service";

/** GET /api/attendance?date=2026-11-12&branchId= */
export const GET = route(async (req) => {
  await requireSession("attendance");
  const q = searchParams(req);
  return listAttendance({ date: q.get("date") ? fromDateInput(q.get("date")!) : null, branchId: q.get("branchId") });
});

/** POST /api/attendance → check a member in (or out, if already inside)
 *  { memberId } or { code: "M-1001" | phone }  (+ override: true to admit without active plan) */
export const POST = route(async (req) => {
  const session = await requireSession("attendance");
  const input = await readBody(req, checkInSchema);
  let memberId = input.memberId;
  if (!memberId && input.code) memberId = (await findMemberForCheckIn(input.code)).id;
  if (!memberId) throw new ApiError(400, "Choose a member or enter a member code.");
  return recordAccess({
    memberId,
    branchId: input.branchId ?? session.branchId,
    source: "MANUAL",
    override: input.override && session.role !== "TRAINER",
  });
});
