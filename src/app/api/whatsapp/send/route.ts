import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { whatsappSendSchema } from "@/server/validators";
import { sendToMember } from "@/server/services/whatsapp.service";
import { audit } from "@/server/services/audit.service";

/**
 * POST /api/whatsapp/send  { memberId, type, text?, extra? }
 * → { mode: "api" | "link", status, url }  — in link mode the browser opens `url` (WhatsApp with the text ready)
 */
export const POST = route(async (req) => {
  const s = await requireGym("messages");
  const input = await readBody(req, whatsappSendSchema);
  const r = await sendToMember(s, input, req.nextUrl.origin);
  await audit(s, "whatsapp.send", "Member", input.memberId, `WhatsApp ${input.type.toLowerCase().replace(/_/g, " ")} ${r.mode === "api" ? (r.status === "SENT" ? "sent" : "failed") : "opened"} to ${r.to}`);
  return r;
});
