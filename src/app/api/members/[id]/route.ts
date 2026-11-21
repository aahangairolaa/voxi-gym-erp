import { route, readBody } from "@/server/http";
import { requireGym, requireGymRole } from "@/server/auth";
import { memberSchema } from "@/server/validators";
import { deleteMember, getMember, updateMember } from "@/server/services/members.service";
import { audit } from "@/server/services/audit.service";

type Params = { id: string };

/** GET /api/members/:id → full profile with memberships, payments, visits */
export const GET = route<Params>(async (_req, { id }) => {
  const s = await requireGym("members");
  return getMember(s.gymId, id);
});

/** PUT /api/members/:id  (photo: omit to keep, null to remove) */
export const PUT = route<Params>(async (req, { id }) => {
  const s = await requireGym("memberships");
  const m = await updateMember(s.gymId, id, await readBody(req, memberSchema));
  await audit(s, "member.update", "Member", id, `Edited member ${m.firstName} ${m.lastName} (${m.code})`);
  return m;
});

/** DELETE /api/members/:id  (owner & manager only) */
export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  const m = await deleteMember(s.gymId, id);
  await audit(s, "member.delete", "Member", id, `Deleted member ${m.firstName} ${m.lastName} (${m.code})`);
  return { ok: true };
});
