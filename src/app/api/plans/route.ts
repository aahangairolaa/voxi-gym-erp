import { route, readBody, searchParams } from "@/server/http";
import { requireGym, requireGymRole } from "@/server/auth";
import { planSchema } from "@/server/validators";
import { createPlan, listPlans } from "@/server/services/plans.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/plans?active=1 */
export const GET = route(async (req) => {
  const s = await requireGym();
  return { plans: await listPlans(s.gymId, searchParams(req).get("active") !== "1") };
});

/** POST /api/plans  (owner & manager) */
export const POST = route(async (req) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  const p = await createPlan(s.gymId, await readBody(req, planSchema));
  await audit(s, "plan.create", "Plan", p.id, `Created plan ${p.name} (QAR ${p.price})`);
  return p;
});
