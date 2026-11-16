import { route, readBody } from "@/server/http";
import { deviceScanSchema } from "@/server/validators";
import { authenticateDevice, handleScan } from "@/server/services/biometric.service";

/**
 * POST /api/biometric/scan   ← called by the biometric device / bridge, NOT by staff.
 * Header:  x-device-key: vxk_...
 * Body:    { "biometricUserId": "1001", "scannedAt": "2026-11-12T18:30:00+03:00", "direction": "auto" }
 * Reply:   { allowed, action: "IN" | "OUT" | "DENIED", reason, member }
 *          → the bridge opens the turnstile when allowed === true
 */
export const POST = route(async (req) => {
  const device = await authenticateDevice(req.headers);
  const input = await readBody(req, deviceScanSchema);
  const result = await handleScan({
    device,
    biometricUserId: input.biometricUserId,
    scannedAt: input.scannedAt ? new Date(input.scannedAt) : undefined,
    direction: input.direction,
    raw: input,
  });
  return {
    allowed: result.allowed,
    action: result.action,
    reason: result.reason,
    member: result.member ? { code: result.member.code, name: result.member.name, status: result.member.status } : null,
  };
});
