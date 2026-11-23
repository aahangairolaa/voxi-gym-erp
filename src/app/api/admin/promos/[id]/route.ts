import { z } from "zod";
import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { setPromoActive } from "@/server/services/promo.service";
import { logAdmin } from "@/server/services/admin-log.service";

/** PATCH /api/admin/promos/:id { active } → switch a code on or off (codes are kept for the record) */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const s = await requireRole("SUPER_ADMIN");
  const { active } = await readBody(req, z.object({ active: z.boolean() }));
  const p = await setPromoActive(id, active);
  await logAdmin(s.name, "promo.update", `Switched promo code ${p.code} ${active ? "on" : "off"}`);
  return p;
});
