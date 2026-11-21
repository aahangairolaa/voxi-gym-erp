import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { resolveIssue, undoLog } from "@/server/services/housekeeping.service";

type Params = { id: string };

/** DELETE /api/housekeeping/logs/:id → undo a tick */
export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGym("housekeeping");
  return undoLog(s, id);
});

/** POST /api/housekeeping/logs/:id → mark a reported issue as resolved */
export const POST = route<Params>(async (_req, { id }) => {
  const s = await requireGym("housekeeping");
  return resolveIssue(s, id);
});
