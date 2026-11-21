import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { enrollSchema } from "@/server/validators";
import { listEnrollments, setEnrollment } from "@/server/services/biometric.service";

/** GET /api/biometric/enrollments → members linked to a biometric user id */
export const GET = route(async () => {
  const s = await requireGym("biometric");
  return listEnrollments(s.gymId);
});

/** POST /api/biometric/enrollments  { memberId, biometricId }  (biometricId null = remove) */
export const POST = route(async (req) => {
  const s = await requireGym("attendance");
  const { memberId, biometricId } = await readBody(req, enrollSchema);
  return setEnrollment(s.gymId, memberId, biometricId);
});
