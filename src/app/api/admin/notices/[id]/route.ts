import { z } from "zod";
import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { setNoticeActive } from "@/server/services/platform.service";

/** PATCH /api/admin/notices/:id { active } → take an announcement down (or put it back up) */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requireRole("SUPER_ADMIN");
  const { active } = await readBody(req, z.object({ active: z.boolean() }));
  return setNoticeActive(id, active);
});
