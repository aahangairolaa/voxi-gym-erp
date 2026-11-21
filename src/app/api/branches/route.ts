import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { branchSchema } from "@/server/validators";
import { createBranch, listBranches } from "@/server/services/settings.service";
import { audit } from "@/server/services/audit.service";

export const GET = route(async () => {
  const s = await requireGym();
  return { branches: await listBranches(s.gymId) };
});

export const POST = route(async (req) => {
  const s = await requireGym("settings");
  const b = await createBranch(s.gymId, await readBody(req, branchSchema));
  await audit(s, "branch.create", "Branch", b.id, `Added branch ${b.name}`);
  return b;
});
