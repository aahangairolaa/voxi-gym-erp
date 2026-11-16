import { route, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { quickSearch } from "@/server/services/members.service";

/** GET /api/search?q=hamad → quick member lookup (global search, check-in) */
export const GET = route(async (req) => {
  await requireSession("members");
  return { results: await quickSearch(searchParams(req).get("q") ?? "") };
});
