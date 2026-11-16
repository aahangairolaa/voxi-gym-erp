import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { exerciseSchema } from "@/server/validators";
import { createExercise, listExercises } from "@/server/services/workouts.service";

/** GET /api/workouts/exercises → exercise library */
export const GET = route(async () => {
  await requireSession();
  return { exercises: await listExercises() };
});

export const POST = route(async (req) => {
  await requireSession("workouts");
  return createExercise(await readBody(req, exerciseSchema));
});
