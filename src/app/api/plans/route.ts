import { route, readBody, searchParams } from "@/server/http";
import { requireRole, requireSession } from "@/server/auth";
import { planSchema } from "@/server/validators";
import { createPlan, listPlans } from "@/server/services/plans.service";

/** GET /api/plans?active=1 */
export const GET = route(async (req) => {
  await requireSession();
  return { plans: await listPlans(searchParams(req).get("active") !== "1") };
});

/** POST /api/plans  (owner & manager) */
export const POST = route(async (req) => {
  await requireRole("OWNER", "MANAGER");
  return createPlan(await readBody(req, planSchema));
});
