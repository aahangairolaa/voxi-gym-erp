import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getCafe } from "@/server/services/cafe.service";

/** GET /api/cafe → menu, today's takings, recent sales and café team; { enabled: false } while the add-on isn't paid for */
export const GET = route(async () => getCafe(await requireGym("cafe")));
