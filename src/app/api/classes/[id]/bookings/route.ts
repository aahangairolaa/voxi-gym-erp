import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { bookingSchema, bookingUpdateSchema } from "@/server/validators";
import { bookClass, updateBooking } from "@/server/services/classes.service";

/** POST /api/classes/:id/bookings  { memberId } → book a spot */
export const POST = route<{ id: string }>(async (req, { id }) => {
  await requireSession("classes");
  const { memberId } = await readBody(req, bookingSchema);
  return bookClass(id, memberId);
});

/** PATCH /api/classes/:id/bookings  { bookingId, status } → attended / cancelled / no-show */
export const PATCH = route(async (req) => {
  await requireSession("classes");
  const { bookingId, status } = await readBody(req, bookingUpdateSchema);
  return updateBooking(bookingId, status);
});
