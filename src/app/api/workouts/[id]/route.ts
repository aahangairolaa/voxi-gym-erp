import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { workoutPlanSchema } from "@/server/validators";
import { deleteWorkoutPlan, getWorkoutPlan, updateWorkoutPlan } from "@/server/services/workouts.service";

type Params = { id: string };

export const GET = route<Params>(async (_req, { id }) => {
  await requireSession("members");
  return getWorkoutPlan(id);
});

export const PUT = route<Params>(async (req, { id }) => {
  await requireSession("workouts");
  return updateWorkoutPlan(id, await readBody(req, workoutPlanSchema));
});

export const DELETE = route<Params>(async (_req, { id }) => {
  await requireSession("workouts");
  return deleteWorkoutPlan(id);
});
