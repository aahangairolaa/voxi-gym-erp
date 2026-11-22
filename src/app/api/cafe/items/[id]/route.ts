import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { cafeItemSchema } from "@/server/validators";
import { deleteItem, updateItem } from "@/server/services/cafe.service";
import { audit } from "@/server/services/audit.service";

/** PUT /api/cafe/items/:id → edit a menu item */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("cafe");
  const item = await updateItem(s, id, await readBody(req, cafeItemSchema));
  await audit(s, "cafe.item.update", "CafeItem", id, `Updated ${item.name} on the café menu (QAR ${item.price})`);
  return item;
});

/** DELETE /api/cafe/items/:id → take an item off the menu */
export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("cafe");
  await deleteItem(s, id);
  await audit(s, "cafe.item.delete", "CafeItem", id, "Removed an item from the café menu");
  return { ok: true };
});
