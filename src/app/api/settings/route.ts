import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { settingsSchema } from "@/server/validators";
import { getSettings, updateSettings } from "@/server/services/settings.service";

export const GET = route(async () => {
  await requireSession();
  return getSettings();
});

export const PUT = route(async (req) => {
  await requireSession("settings");
  return updateSettings(await readBody(req, settingsSchema));
});
