import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { whatsappTestSchema } from "@/server/validators";
import { sendTest } from "@/server/services/whatsapp.service";

/** POST /api/whatsapp/test  { phone } → sends a test message through the Business API */
export const POST = route(async (req) => {
  const s = await requireGym("settings");
  const { phone } = await readBody(req, whatsappTestSchema);
  return sendTest(s.gymId, phone);
});
