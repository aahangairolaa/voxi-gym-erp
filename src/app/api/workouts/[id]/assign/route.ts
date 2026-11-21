import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { assignWorkoutSchema } from "@/server/validators";
import { assignWorkoutPlan } from "@/server/services/workouts.service";

/** POST /api/workouts/:id/assign  { memberId } → copies a template to a member */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("workouts");
  const { memberId } = await readBody(req, assignWorkoutSchema);
  return assignWorkoutPlan(s.gymId, id, memberId);
});
