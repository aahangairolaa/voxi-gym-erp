import { route, readBody, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { workoutPlanSchema } from "@/server/validators";
import { createWorkoutPlan, listWorkoutPlans } from "@/server/services/workouts.service";

/** GET /api/workouts?memberId= → workout programmes (templates have no member) */
export const GET = route(async (req) => {
  const s = await requireGym("members");
  return { plans: await listWorkoutPlans(s.gymId, { memberId: searchParams(req).get("memberId") }) };
});

export const POST = route(async (req) => {
  const s = await requireGym("workouts");
  return createWorkoutPlan(s.gymId, await readBody(req, workoutPlanSchema));
});
