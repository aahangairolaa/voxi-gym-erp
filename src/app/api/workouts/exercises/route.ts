import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { exerciseSchema } from "@/server/validators";
import { createExercise, listExercises } from "@/server/services/workouts.service";

/** GET /api/workouts/exercises → this gym's exercise library */
export const GET = route(async () => {
  const s = await requireGym();
  return { exercises: await listExercises(s.gymId) };
});

export const POST = route(async (req) => {
  const s = await requireGym("workouts");
  return createExercise(s.gymId, await readBody(req, exerciseSchema));
});
