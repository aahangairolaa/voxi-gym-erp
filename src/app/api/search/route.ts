import { route, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { quickSearch } from "@/server/services/members.service";

/** GET /api/search?q=hamad → quick member lookup (global search, check-in) */
export const GET = route(async (req) => {
  const s = await requireGym("members");
  return { results: await quickSearch(s.gymId, searchParams(req).get("q") ?? "") };
});
