import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getPt } from "@/server/services/pt.service";

/** GET /api/pt?trainerId=&status=ACTIVE|COMPLETED|CANCELLED|all → PT clients, recent sessions, stats and trainer leaderboard (trainers: their own only) */
export const GET = route(async (req) => {
  const s = await requireGym("pt");
  const q = req.nextUrl.searchParams;
  return getPt(s, { trainerId: q.get("trainerId"), status: q.get("status") });
});
