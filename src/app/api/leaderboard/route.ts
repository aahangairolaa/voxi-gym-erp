import { route, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getLeaderboard } from "@/server/services/leaderboard.service";

/** GET /api/leaderboard?period=week|month|all */
export const GET = route(async (req) => {
  const s = await requireGym("leaderboard");
  const p = searchParams(req).get("period");
  return getLeaderboard(s.gymId, p === "week" || p === "all" ? p : "month");
});
