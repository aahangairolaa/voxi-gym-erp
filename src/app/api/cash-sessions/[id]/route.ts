import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { getCashSession } from "@/server/services/cash.service";

/** GET /api/cash-sessions/:id → session with its payments & expenses */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  await requireSession("cash");
  return getCashSession(id);
});
