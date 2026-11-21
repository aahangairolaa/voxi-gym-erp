import { route, readBody } from "@/server/http";
import { requireGymRole } from "@/server/auth";
import { planSchema } from "@/server/validators";
import { deletePlan, updatePlan } from "@/server/services/plans.service";
import { audit } from "@/server/services/audit.service";

type Params = { id: string };

export const PUT = route<Params>(async (req, { id }) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  const p = await updatePlan(s.gymId, id, await readBody(req, planSchema));
  await audit(s, "plan.update", "Plan", id, `Edited plan ${p.name} (QAR ${p.price})`);
  return p;
});

/** Deletes the plan, or archives it if it was ever sold. */
export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  const r = await deletePlan(s.gymId, id);
  await audit(s, "plan.delete", "Plan", id, `${r.archived ? "Archived" : "Deleted"} plan ${r.name}`);
  return r;
});
