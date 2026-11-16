import { route, readBody, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { createMemberSchema } from "@/server/validators";
import { createMember, listMembers } from "@/server/services/members.service";

/** GET /api/members?search=&status=ACTIVE|EXPIRING|FROZEN|EXPIRED|NONE&branchId= */
export const GET = route(async (req) => {
  await requireSession("members");
  const q = searchParams(req);
  return listMembers({ search: q.get("search"), status: q.get("status"), branchId: q.get("branchId") });
});

/** POST /api/members → create a member (optionally sell a plan at the same time) */
export const POST = route(async (req) => {
  const session = await requireSession("memberships");
  const input = await readBody(req, createMemberSchema);
  return createMember(input, session);
});
