import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { memberSendSchema } from "@/server/validators";
import { sendToMemberWithFiles } from "@/server/services/member-send.service";

/**
 * POST /api/members/:id/send  { channel: "EMAIL" | "WHATSAPP", subject?, text, attachments: [{ name, type, data(base64) }] }
 * Email goes through VOXI; WhatsApp with files needs the gym's WhatsApp Business API.
 */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("messages");
  return sendToMemberWithFiles(s, id, await readBody(req, memberSendSchema));
});
