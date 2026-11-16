import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { workoutLogSchema } from "@/server/validators";
import { listWorkoutLogs, logWorkout } from "@/server/services/workouts.service";

/** GET /api/workouts/logs → latest completed workouts */
export const GET = route(async () => {
  await requireSession("workouts");
  return { logs: await listWorkoutLogs() };
});

/** POST /api/workouts/logs  { memberId, durationMin, workoutPlanId?, calories?, notes? } */
export const POST = route(async (req) => {
  await requireSession("attendance");
  return logWorkout(await readBody(req, workoutLogSchema));
});
