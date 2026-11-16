import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { deviceSchema } from "@/server/validators";
import { createDevice, listDevices } from "@/server/services/biometric.service";

/** GET /api/biometric/devices */
export const GET = route(async () => {
  await requireSession("biometric");
  return { devices: await listDevices() };
});

/** POST /api/biometric/devices → register a device. The reply contains the API key ONCE. */
export const POST = route(async (req) => {
  await requireSession("biometric");
  return createDevice(await readBody(req, deviceSchema));
});
