import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { planSchema } from "@/server/validators";
import { deletePlan, updatePlan } from "@/server/services/plans.service";

type Params = { id: string };

export const PUT = route<Params>(async (req, { id }) => {
  await requireRole("OWNER", "MANAGER");
  return updatePlan(id, await readBody(req, planSchema));
});

/** Deletes the plan, or archives it if it was ever sold. */
export const DELETE = route<Params>(async (_req, { id }) => {
  await requireRole("OWNER", "MANAGER");
  return deletePlan(id);
});
