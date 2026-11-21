import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { membershipActionSchema } from "@/server/validators";
import { membershipAction } from "@/server/services/memberships.service";
import { audit } from "@/server/services/audit.service";

const VERB = { freeze: "Froze", unfreeze: "Unfroze", cancel: "Cancelled" } as const;

/** POST /api/memberships/:id  { action: "freeze" | "unfreeze" | "cancel" } */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("memberships");
  const { action } = await readBody(req, membershipActionSchema);
  const r = await membershipAction(s.gymId, id, action);
  await audit(s, `membership.${action}`, "Membership", id, `${VERB[action]} ${r.label}`);
  return r;
});
