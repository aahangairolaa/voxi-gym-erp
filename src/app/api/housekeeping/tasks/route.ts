import { route, readBody } from "@/server/http";
import { requireGym, requireGymRole } from "@/server/auth";
import { housekeepingTaskSchema } from "@/server/validators";
import { createTask, listTasks } from "@/server/services/housekeeping.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/housekeeping/tasks → all tasks (to manage the checklist) */
export const GET = route(async () => {
  const s = await requireGym("housekeeping");
  return { tasks: await listTasks(s.gymId) };
});

/** POST /api/housekeeping/tasks  (owner & manager) */
export const POST = route(async (req) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  const t = await createTask(s.gymId, await readBody(req, housekeepingTaskSchema));
  await audit(s, "housekeeping.task", "HousekeepingTask", t.id, `Added cleaning task "${t.title}" (${t.area})`);
  return t;
});
