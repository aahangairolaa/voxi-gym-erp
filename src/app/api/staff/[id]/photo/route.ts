import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getStaffPhoto } from "@/server/services/staff.service";

/** GET /api/staff/:id/photo → the staff member's photo (for <img> tags). ?v= busts the cache on change. */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym();
  const photo = await getStaffPhoto(s.gymId, id);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: { "Content-Type": photo.contentType, "Cache-Control": "private, max-age=31536000, immutable" },
  });
});
