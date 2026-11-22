import { z } from "zod";
import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { setPromoActive } from "@/server/services/promo.service";

/** PATCH /api/admin/promos/:id { active } → switch a code on or off (codes are kept for the record) */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requireRole("SUPER_ADMIN");
  const { active } = await readBody(req, z.object({ active: z.boolean() }));
  return setPromoActive(id, active);
});
