import { z } from "zod";
import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { setNoticeActive } from "@/server/services/platform.service";
import { logAdmin } from "@/server/services/admin-log.service";

/** PATCH /api/admin/notices/:id { active } → take an announcement down (or put it back up) */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const s = await requireRole("SUPER_ADMIN");
  const { active } = await readBody(req, z.object({ active: z.boolean() }));
  const n = await setNoticeActive(id, active);
  await logAdmin(s.name, "notice.update", active ? "Put an announcement back up" : "Took an announcement down");
  return n;
});
