import { route, readBody, searchParams } from "@/server/http";
import { requireGym, requireGymRole } from "@/server/auth";
import { fromDateInput } from "@/lib/dates";
import { classSchema } from "@/server/validators";
import { createClass, listClasses } from "@/server/services/classes.service";

/** GET /api/classes?from=2026-11-12&days=7 */
export const GET = route(async (req) => {
  const s = await requireGym("classes");
  const q = searchParams(req);
  return {
    classes: await listClasses(s.gymId, {
      from: q.get("from") ? fromDateInput(q.get("from")!) : null,
      days: Number(q.get("days") ?? 7) || 7,
    }),
  };
});

export const POST = route(async (req) => {
  const s = await requireGymRole("OWNER", "MANAGER", "TRAINER");
  return createClass(s.gymId, await readBody(req, classSchema));
});
