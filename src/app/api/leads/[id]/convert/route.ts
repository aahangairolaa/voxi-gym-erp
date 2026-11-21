import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { convertLead } from "@/server/services/leads.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/leads/:id/convert → creates a member from the lead */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("memberships");
  const m = await convertLead(s.gymId, id, s.branchId);
  await audit(s, "lead.convert", "Member", m.id, `Converted a lead into member ${m.firstName} ${m.lastName} (${m.code})`);
  return m;
});
