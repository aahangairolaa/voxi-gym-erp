import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { housekeepingLogSchema } from "@/server/validators";
import { logTask } from "@/server/services/housekeeping.service";

/** POST /api/housekeeping/logs  { taskId?, status: "DONE" | "ISSUE", note?, area? } */
export const POST = route(async (req) => {
  const s = await requireGym("housekeeping");
  return logTask(s, await readBody(req, housekeepingLogSchema));
});
