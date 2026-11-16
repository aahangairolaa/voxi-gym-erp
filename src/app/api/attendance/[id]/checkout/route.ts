import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { checkOut } from "@/server/services/attendance.service";

/** POST /api/attendance/:id/checkout */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  await requireSession("attendance");
  return checkOut(id);
});
