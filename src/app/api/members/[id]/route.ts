import { route, readBody } from "@/server/http";
import { requireRole, requireSession } from "@/server/auth";
import { memberSchema } from "@/server/validators";
import { deleteMember, getMember, updateMember } from "@/server/services/members.service";

type Params = { id: string };

/** GET /api/members/:id → full profile with memberships, payments, visits */
export const GET = route<Params>(async (_req, { id }) => {
  await requireSession("members");
  return getMember(id);
});

/** PUT /api/members/:id */
export const PUT = route<Params>(async (req, { id }) => {
  await requireSession("memberships");
  return updateMember(id, await readBody(req, memberSchema));
});

/** DELETE /api/members/:id  (owner & manager only) */
export const DELETE = route<Params>(async (_req, { id }) => {
  await requireRole("OWNER", "MANAGER");
  return deleteMember(id);
});
