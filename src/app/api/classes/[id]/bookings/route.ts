import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { bookingSchema, bookingUpdateSchema } from "@/server/validators";
import { bookClass, updateBooking } from "@/server/services/classes.service";

/** POST /api/classes/:id/bookings  { memberId } → book a spot */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("classes");
  const { memberId } = await readBody(req, bookingSchema);
  return bookClass(s.gymId, id, memberId);
});

/** PATCH /api/classes/:id/bookings  { bookingId, status } → attended / cancelled / no-show */
export const PATCH = route(async (req) => {
  const s = await requireGym("classes");
  const { bookingId, status } = await readBody(req, bookingUpdateSchema);
  return updateBooking(s.gymId, bookingId, status);
});
