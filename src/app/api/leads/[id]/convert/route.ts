import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { convertLead } from "@/server/services/leads.service";

/** POST /api/leads/:id/convert → creates a member from the lead */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  const session = await requireSession("memberships");
  return convertLead(id, session.branchId);
});
