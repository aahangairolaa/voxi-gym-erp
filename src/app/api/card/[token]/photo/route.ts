import { route } from "@/server/http";
import { getCardPhoto } from "@/server/services/card.service";

/** GET /api/card/:token/photo  (public) → the photo on the member's digital card */
export const GET = route<{ token: string }>(async (_req, { token }) => {
  const photo = await getCardPhoto(token);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: { "Content-Type": photo.contentType, "Cache-Control": "public, max-age=86400" },
  });
});
