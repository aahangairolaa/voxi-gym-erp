import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { branchSchema } from "@/server/validators";
import { updateBranch } from "@/server/services/settings.service";

export const PUT = route<{ id: string }>(async (req, { id }) => {
  await requireSession("settings");
  return updateBranch(id, await readBody(req, branchSchema));
});
