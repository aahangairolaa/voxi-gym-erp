import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { planRequestSchema } from "@/server/validators";
import { cancelPlanRequest, getBilling, requestPlan } from "@/server/services/billing.service";
import { audit } from "@/server/services/audit.service";
import { qar } from "@/lib/pricing";

/** GET /api/billing → this gym's subscription, branches used and any pending plan request */
export const GET = route(async () => {
  const s = await requireGym("billing");
  return getBilling(s.gymId);
});

/** POST /api/billing { months, extraBranches, entrances, onboarding, promoCode? } → ask VOXI to start or change the subscription */
export const POST = route(async (req) => {
  const s = await requireGym("billing");
  const r = await requestPlan(s.gymId, s.name, await readBody(req, planRequestSchema));
  const extra = r.quote.extraBranches ? ` + ${r.quote.extraBranches} branch${r.quote.extraBranches === 1 ? "" : "es"}` : "";
  const setup = r.oneTime ? `, plus ${qar(r.oneTime)} one-time` : "";
  const promo = r.request.promoCode ? `, code ${r.request.promoCode} -${qar(r.request.promoDiscount ?? 0)}` : "";
  await audit(s, "billing.request", "Gym", s.gymId, `Requested VOXI ${r.quote.termLabel}${extra} (${qar(r.quote.total)}${setup}${promo}; first invoice ${qar(r.totalToday)})`);
  return r;
});

/** DELETE /api/billing → withdraw the pending plan request */
export const DELETE = route(async () => {
  const s = await requireGym("billing");
  await cancelPlanRequest(s.gymId);
  await audit(s, "billing.cancel", "Gym", s.gymId, "Withdrew the plan request");
  return { ok: true };
});
