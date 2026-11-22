import { route, searchParams } from "@/server/http";
import { hasPermission, requireGym } from "@/server/auth";
import { maskContacts } from "@/server/privacy";
import { quickSearch } from "@/server/services/members.service";

/** GET /api/search?q=james → quick member lookup (global search, check-in) */
export const GET = route(async (req) => {
  const s = await requireGym("members");
  const results = await quickSearch(s.gymId, searchParams(req).get("q") ?? "");
  return { results: (await hasPermission(s, "contacts")) ? results : maskContacts(results) };
});
