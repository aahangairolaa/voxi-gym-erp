import { route, readBody, searchParams, ApiError } from "@/server/http";
import { requireGym } from "@/server/auth";
import { fromDateInput } from "@/lib/dates";
import { checkInSchema } from "@/server/validators";
import { findMemberForCheckIn, listAttendance, recordAccess } from "@/server/services/attendance.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/attendance?date=2026-11-12&branchId= */
export const GET = route(async (req) => {
  const s = await requireGym("attendance");
  const q = searchParams(req);
  return listAttendance(s.gymId, { date: q.get("date") ? fromDateInput(q.get("date")!) : null, branchId: q.get("branchId") });
});

/** POST /api/attendance → check a member in (or out, if already inside)
 *  { memberId } or { code: "M-1001" | phone | QR card token/link }  (+ override: true to admit without active plan) */
export const POST = route(async (req) => {
  const s = await requireGym("attendance");
  const input = await readBody(req, checkInSchema);
  let memberId = input.memberId;
  let source: "MANUAL" | "QR" = "MANUAL";
  if (!memberId && input.code) {
    const found = await findMemberForCheckIn(s.gymId, input.code);
    memberId = found.id;
    source = found.via;
  }
  if (!memberId) throw new ApiError(400, "Choose a member or enter a member code.");
  const override = input.override && s.role !== "TRAINER";
  const r = await recordAccess({ gymId: s.gymId, memberId, branchId: input.branchId ?? s.branchId, source, override });
  if (override && r.allowed && r.reason) {
    await audit(s, "attendance.override", "Member", memberId, `Let ${r.member.name} in without a valid membership (${r.member.status.toLowerCase()})`);
  }
  return r;
});
