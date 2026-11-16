import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { branchSchema } from "@/server/validators";
import { createBranch, listBranches } from "@/server/services/settings.service";

export const GET = route(async () => {
  await requireSession();
  return { branches: await listBranches() };
});

export const POST = route(async (req) => {
  await requireSession("settings");
  return createBranch(await readBody(req, branchSchema));
});
