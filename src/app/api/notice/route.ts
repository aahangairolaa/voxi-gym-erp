import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { db } from "@/server/db";
import { activeNotice } from "@/server/services/platform.service";

/** GET /api/notice → the VOXI announcement this gym should see right now, or null */
export const GET = route(async () => {
  const s = await requireSession(undefined, { allowLocked: true });
  if (!s.gymId) return { notice: null };
  const g = await db.gym.findUnique({ where: { id: s.gymId }, select: { status: true } });
  return { notice: await activeNotice(g?.status ?? null) };
});
