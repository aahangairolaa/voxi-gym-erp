import { route, readBody, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { sellMembershipSchema } from "@/server/validators";
import { listMemberships, sellMembership } from "@/server/services/memberships.service";

/** GET /api/memberships?status=&search= */
export const GET = route(async (req) => {
  await requireSession("memberships");
  const q = searchParams(req);
  return listMemberships({ status: q.get("status"), search: q.get("search") });
});

/** POST /api/memberships → sell or renew a plan (+ payment) */
export const POST = route(async (req) => {
  const session = await requireSession("memberships");
  return sellMembership(await readBody(req, sellMembershipSchema), session);
});
