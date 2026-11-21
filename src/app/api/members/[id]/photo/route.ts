import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getMemberPhoto } from "@/server/services/members.service";

/** GET /api/members/:id/photo → the member's photo (for <img> tags). The ?v= in the URL busts the cache on change. */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym();
  const photo = await getMemberPhoto(s.gymId, id);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: { "Content-Type": photo.contentType, "Cache-Control": "private, max-age=31536000, immutable" },
  });
});
