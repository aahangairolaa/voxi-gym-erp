import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { whatsappBulkSchema } from "@/server/validators";
import { sendBulk } from "@/server/services/whatsapp.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/whatsapp/bulk  { memberIds, type } → sends via the WhatsApp Business API (API mode only) */
export const POST = route(async (req) => {
  const s = await requireGym("messages");
  const { memberIds, type } = await readBody(req, whatsappBulkSchema);
  const r = await sendBulk(s, memberIds, type, req.nextUrl.origin);
  await audit(s, "whatsapp.bulk", null, null, `Bulk WhatsApp ${type.toLowerCase().replace(/_/g, " ")}: ${r.sent} sent, ${r.failed} failed`);
  return r;
});
