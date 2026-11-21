import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { whatsappConfigSchema } from "@/server/validators";
import { getConfig, updateConfig } from "@/server/services/whatsapp.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/whatsapp/config → mode (api/link), connection fields (no secrets), webhook details, templates */
export const GET = route(async () => {
  const s = await requireGym("messages");
  return getConfig(s.gymId);
});

/** PUT /api/whatsapp/config  (owner) — accessToken/appSecret: omit or "" to keep, null to remove */
export const PUT = route(async (req) => {
  const s = await requireGym("settings");
  const cfg = await updateConfig(s.gymId, await readBody(req, whatsappConfigSchema));
  await audit(s, "settings.whatsapp", "Gym", s.gymId, `Updated WhatsApp settings (${cfg.mode === "api" ? "Business API on" : "WhatsApp links"})`);
  return cfg;
});
