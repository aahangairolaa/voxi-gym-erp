import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { workoutLogSchema } from "@/server/validators";
import { listWorkoutLogs, logWorkout } from "@/server/services/workouts.service";

/** GET /api/workouts/logs → latest completed workouts */
export const GET = route(async () => {
  const s = await requireGym("workouts");
  return { logs: await listWorkoutLogs(s.gymId) };
});

/** POST /api/workouts/logs  { memberId, durationMin, workoutPlanId?, calories?, notes? } */
export const POST = route(async (req) => {
  const s = await requireGym("attendance");
  return logWorkout(s.gymId, await readBody(req, workoutLogSchema));
});
