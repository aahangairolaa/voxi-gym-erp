import { route, readBody } from "@/server/http";
import { hasPermission, requireGym, requirePermission } from "@/server/auth";
import { maskContacts } from "@/server/privacy";
import { memberSchema } from "@/server/validators";
import { deleteMember, getMember, updateMember } from "@/server/services/members.service";
import { audit } from "@/server/services/audit.service";

type Params = { id: string };

/** GET /api/members/:id → full profile with memberships, payments, visits */
export const GET = route<Params>(async (_req, { id }) => {
  const s = await requireGym("members");
  const m = await getMember(s.gymId, id);
  return (await hasPermission(s, "contacts")) ? m : maskContacts(m);
});

/** PUT /api/members/:id  (photo: omit to keep, null to remove) */
export const PUT = route<Params>(async (req, { id }) => {
  const s = await requireGym("memberships");
  const m = await updateMember(s.gymId, id, await readBody(req, memberSchema));
  await audit(s, "member.update", "Member", id, `Edited member ${m.firstName} ${m.lastName} (${m.code})`);
  return m;
});

/** DELETE /api/members/:id  (roles with the "Refunds and deletions" permission) */
export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGym("memberships");
  await requirePermission(s, "refunds");
  const m = await deleteMember(s.gymId, id);
  await audit(s, "member.delete", "Member", id, `Deleted member ${m.firstName} ${m.lastName} (${m.code})`);
  return { ok: true };
});
