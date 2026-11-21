import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getCashSession } from "@/server/services/cash.service";

/** GET /api/cash-sessions/:id → session with its payments & expenses */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("cash");
  return getCashSession(s.gymId, id);
});
