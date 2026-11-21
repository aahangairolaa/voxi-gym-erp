import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { workoutPlanSchema } from "@/server/validators";
import { deleteWorkoutPlan, getWorkoutPlan, updateWorkoutPlan } from "@/server/services/workouts.service";

type Params = { id: string };

export const GET = route<Params>(async (_req, { id }) => {
  const s = await requireGym("members");
  return getWorkoutPlan(s.gymId, id);
});

export const PUT = route<Params>(async (req, { id }) => {
  const s = await requireGym("workouts");
  return updateWorkoutPlan(s.gymId, id, await readBody(req, workoutPlanSchema));
});

export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGym("workouts");
  return deleteWorkoutPlan(s.gymId, id);
});
