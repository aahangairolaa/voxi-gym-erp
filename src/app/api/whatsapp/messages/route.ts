import { route, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { listMessages } from "@/server/services/whatsapp.service";

/** GET /api/whatsapp/messages?type=&memberId= → message log */
export const GET = route(async (req) => {
  const s = await requireGym("messages");
  const q = searchParams(req);
  return listMessages(s.gymId, { type: q.get("type"), memberId: q.get("memberId") });
});
