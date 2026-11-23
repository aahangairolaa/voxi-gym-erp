import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { promoSchema } from "@/server/validators";
import { createPromo, listPromos } from "@/server/services/promo.service";
import { logAdmin } from "@/server/services/admin-log.service";

/** GET /api/admin/promos → every promo code with its uses (VOXI admins only) */
export const GET = route(async () => {
  await requireRole("SUPER_ADMIN");
  return { promos: await listPromos() };
});

/** POST /api/admin/promos { code, kind, value, appliesTo?, minMonths?, expiresAt?, maxUses?, note? } */
export const POST = route(async (req) => {
  const s = await requireRole("SUPER_ADMIN");
  const p = await createPromo(await readBody(req, promoSchema));
  await logAdmin(s.name, "promo.create", `Created promo code ${p.code}`);
  return p;
});
