import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { rotateDeviceKey } from "@/server/services/biometric.service";

/** POST /api/biometric/devices/:id/rotate-key → issue a new key (old one stops working) */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  await requireSession("biometric");
  return rotateDeviceKey(id);
});
