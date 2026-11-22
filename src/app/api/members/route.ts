import { route, readBody, searchParams } from "@/server/http";
import { hasPermission, requireGym } from "@/server/auth";
import { maskContacts } from "@/server/privacy";
import { createMemberSchema } from "@/server/validators";
import { createMember, listMembers } from "@/server/services/members.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/members?search=&status=ACTIVE|EXPIRING|FROZEN|EXPIRED|NONE&branchId= */
export const GET = route(async (req) => {
  const s = await requireGym("members");
  const q = searchParams(req);
  const r = await listMembers(s.gymId, { search: q.get("search"), status: q.get("status"), branchId: q.get("branchId") });
  return (await hasPermission(s, "contacts")) ? r : maskContacts(r);
});

/** POST /api/members → create a member (optionally with a photo and a plan sale) */
export const POST = route(async (req) => {
  const s = await requireGym("memberships");
  const m = await createMember(await readBody(req, createMemberSchema), s);
  await audit(s, "member.create", "Member", m.id, `Added member ${m.firstName} ${m.lastName} (${m.code})`);
  return m;
});
