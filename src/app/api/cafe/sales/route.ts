import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { cafeSaleSchema } from "@/server/validators";
import { sell } from "@/server/services/cafe.service";

/** POST /api/cafe/sales { items: [{ itemId, qty }], method, memberId? } → rings up a café sale */
export const POST = route(async (req) => sell(await requireGym("cafe"), await readBody(req, cafeSaleSchema)));
