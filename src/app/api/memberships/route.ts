import { route, readBody, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { sellMembershipSchema } from "@/server/validators";
import { listMemberships, sellMembership } from "@/server/services/memberships.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/memberships?status=&search= */
export const GET = route(async (req) => {
  const s = await requireGym("memberships");
  const q = searchParams(req);
  return listMemberships(s.gymId, { status: q.get("status"), search: q.get("search") });
});

/** POST /api/memberships → sell or renew a plan (+ payment) */
export const POST = route(async (req) => {
  const s = await requireGym("memberships");
  const r = await sellMembership(await readBody(req, sellMembershipSchema), s);
  const paid = r.payment ? ` — paid QAR ${r.payment.amount} (${r.payment.invoiceNo})` : "";
  await audit(s, "membership.sell", "Membership", r.membership.id, `Sold a membership to ${r.memberName}${paid}`);
  return r;
});
