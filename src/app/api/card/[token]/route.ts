import { route } from "@/server/http";
import { getCard } from "@/server/services/card.service";

/** GET /api/card/:token  (public) → what the member's digital card shows */
export const GET = route<{ token: string }>(async (_req, { token }) => getCard(token));
