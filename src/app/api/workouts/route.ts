import { route, readBody, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { workoutPlanSchema } from "@/server/validators";
import { createWorkoutPlan, listWorkoutPlans } from "@/server/services/workouts.service";

/** GET /api/workouts?memberId= → workout programmes (templates have no member) */
export const GET = route(async (req) => {
  await requireSession("members");
  return { plans: await listWorkoutPlans({ memberId: searchParams(req).get("memberId") }) };
});

export const POST = route(async (req) => {
  await requireSession("workouts");
  return createWorkoutPlan(await readBody(req, workoutPlanSchema));
});
