import { route, readBody } from "@/server/http";
import { requireGymRole } from "@/server/auth";
import { housekeepingTaskSchema } from "@/server/validators";
import { deleteTask, updateTask } from "@/server/services/housekeeping.service";

type Params = { id: string };

export const PUT = route<Params>(async (req, { id }) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  return updateTask(s.gymId, id, await readBody(req, housekeepingTaskSchema));
});

export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  await deleteTask(s.gymId, id);
  return { ok: true };
});
