import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { enrollSchema } from "@/server/validators";
import { listEnrollments, setEnrollment } from "@/server/services/biometric.service";

/** GET /api/biometric/enrollments → members linked to a biometric user id */
export const GET = route(async () => {
  await requireSession("biometric");
  return listEnrollments();
});

/** POST /api/biometric/enrollments  { memberId, biometricId }  (biometricId null = remove) */
export const POST = route(async (req) => {
  await requireSession("attendance");
  const { memberId, biometricId } = await readBody(req, enrollSchema);
  return setEnrollment(memberId, biometricId);
});
