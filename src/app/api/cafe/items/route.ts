import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { cafeItemSchema } from "@/server/validators";
import { createItem } from "@/server/services/cafe.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/cafe/items { name, category, price, calories?, protein?, stock?, active } (owner/manager, max 14) */
export const POST = route(async (req) => {
  const s = await requireGym("cafe");
  const item = await createItem(s, await readBody(req, cafeItemSchema));
  await audit(s, "cafe.item.create", "CafeItem", item.id, `Added ${item.name} to the café menu (QAR ${item.price})`);
  return item;
});
