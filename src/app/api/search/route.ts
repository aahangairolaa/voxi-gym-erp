import { route, searchParams } from "@/server/http";
import { hasPermission, requireGym } from "@/server/auth";
import { maskContacts } from "@/server/privacy";
import { quickSearch } from "@/server/services/members.service";

/** GET /api/search?q=james → quick member lookup (global search, check-in). &recent=1 with no q → newest members. */
export const GET = route(async (req) => {
  const s = await requireGym("members");
  const p = searchParams(req);
  const results = await quickSearch(s.gymId, p.get("q") ?? "", { recent: p.get("recent") === "1" });
  return { results: (await hasPermission(s, "contacts")) ? results : maskContacts(results) };
});
