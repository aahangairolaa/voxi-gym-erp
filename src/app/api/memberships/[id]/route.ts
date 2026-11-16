import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { membershipActionSchema } from "@/server/validators";
import { membershipAction } from "@/server/services/memberships.service";

/** POST /api/memberships/:id  { action: "freeze" | "unfreeze" | "cancel" } */
export const POST = route<{ id: string }>(async (req, { id }) => {
  await requireSession("memberships");
  const { action } = await readBody(req, membershipActionSchema);
  return membershipAction(id, action);
});
