import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { branchSchema } from "@/server/validators";
import { updateBranch } from "@/server/services/settings.service";

export const PUT = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("settings");
  return updateBranch(s.gymId, id, await readBody(req, branchSchema));
});
