import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { settingsSchema } from "@/server/validators";
import { getSettings, updateSettings } from "@/server/services/settings.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/settings → this gym's profile */
export const GET = route(async () => {
  const s = await requireGym();
  return getSettings(s.gymId);
});

/** PUT /api/settings → update the gym profile (logo: omit to keep, null to remove) */
export const PUT = route(async (req) => {
  const s = await requireGym("settings");
  const g = await updateSettings(s.gymId, await readBody(req, settingsSchema));
  await audit(s, "settings.update", "Gym", s.gymId, "Updated the gym profile");
  return g;
});
