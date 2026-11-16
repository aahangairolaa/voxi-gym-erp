import { route, readBody, searchParams } from "@/server/http";
import { requireRole, requireSession } from "@/server/auth";
import { fromDateInput } from "@/lib/dates";
import { classSchema } from "@/server/validators";
import { createClass, listClasses } from "@/server/services/classes.service";

/** GET /api/classes?from=2026-11-12&days=7 */
export const GET = route(async (req) => {
  await requireSession("classes");
  const q = searchParams(req);
  return {
    classes: await listClasses({
      from: q.get("from") ? fromDateInput(q.get("from")!) : null,
      days: Number(q.get("days") ?? 7) || 7,
    }),
  };
});

export const POST = route(async (req) => {
  await requireRole("OWNER", "MANAGER", "TRAINER");
  return createClass(await readBody(req, classSchema));
});
