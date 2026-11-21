import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { deviceSchema } from "@/server/validators";
import { createDevice, listDevices } from "@/server/services/biometric.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/biometric/devices */
export const GET = route(async () => {
  const s = await requireGym("biometric");
  return { devices: await listDevices(s.gymId) };
});

/** POST /api/biometric/devices → register a device. The reply contains the API key ONCE. */
export const POST = route(async (req) => {
  const s = await requireGym("biometric");
  const r = await createDevice(s.gymId, await readBody(req, deviceSchema));
  await audit(s, "device.create", "BiometricDevice", r.device.id, `Registered device ${r.device.name} (${r.device.serialNumber})`);
  return r;
});
