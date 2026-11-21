import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { deviceSchema } from "@/server/validators";
import { deleteDevice, updateDevice } from "@/server/services/biometric.service";
import { audit } from "@/server/services/audit.service";

type Params = { id: string };

export const PUT = route<Params>(async (req, { id }) => {
  const s = await requireGym("biometric");
  const d = await updateDevice(s.gymId, id, await readBody(req, deviceSchema));
  await audit(s, "device.update", "BiometricDevice", id, `Edited device ${d.name}`);
  return d;
});

export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGym("biometric");
  await deleteDevice(s.gymId, id);
  await audit(s, "device.delete", "BiometricDevice", id, "Removed a biometric device");
  return { ok: true };
});
