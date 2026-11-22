import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { findUsablePromo } from "@/server/services/promo.service";

/** GET /api/billing/promo?code=LAUNCH20&months=12 → the code's discount, or a 400 saying why it can't be used */
export const GET = route(async (req) => {
  await requireGym("billing");
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const months = Number(req.nextUrl.searchParams.get("months")) || undefined;
  return findUsablePromo(code, months);
});
