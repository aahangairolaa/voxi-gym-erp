import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { extraItemSchema } from "@/server/validators";
import { deleteExtra, updateExtra } from "@/server/services/extras.service";
import { audit } from "@/server/services/audit.service";

/** PUT /api/extras/:id → change an extra's name, price or on/off */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("sales");
  const item = await updateExtra(s, id, await readBody(req, extraItemSchema));
  await audit(s, "extra.update", "ExtraItem", id, `Updated ${item.name} (QAR ${item.price}) in the extras price list`);
  return item;
});

/** DELETE /api/extras/:id → remove from the price list (past charges stay) */
export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("sales");
  await deleteExtra(s, id);
  await audit(s, "extra.delete", "ExtraItem", id, "Removed an extra from the price list");
  return { ok: true };
});
