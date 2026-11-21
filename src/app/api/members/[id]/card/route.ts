import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { regenerateCard } from "@/server/services/members.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/members/:id/card → issue a new card link / QR code (the old one stops working) */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("memberships");
  const r = await regenerateCard(s.gymId, id);
  await audit(s, "member.card", "Member", id, "Issued a new digital card / QR code");
  return r;
});
