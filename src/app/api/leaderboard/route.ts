import { route, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { getLeaderboard } from "@/server/services/leaderboard.service";

/** GET /api/leaderboard?period=week|month|all */
export const GET = route(async (req) => {
  await requireSession("leaderboard");
  const p = searchParams(req).get("period");
  return getLeaderboard(p === "week" || p === "all" ? p : "month");
});
