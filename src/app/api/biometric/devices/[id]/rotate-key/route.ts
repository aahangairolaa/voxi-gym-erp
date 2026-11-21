import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { rotateDeviceKey } from "@/server/services/biometric.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/biometric/devices/:id/rotate-key → issue a new key (old one stops working) */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("biometric");
  const r = await rotateDeviceKey(s.gymId, id);
  await audit(s, "device.rotate-key", "BiometricDevice", id, "Issued a new device API key");
  return r;
});
