import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { checkOut } from "@/server/services/attendance.service";

/** POST /api/attendance/:id/checkout */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("attendance");
  return checkOut(s.gymId, id);
});
