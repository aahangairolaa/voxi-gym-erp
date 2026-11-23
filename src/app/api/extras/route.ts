import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { extraItemSchema } from "@/server/validators";
import { createExtra, listExtras } from "@/server/services/extras.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/extras → the gym's price list of extras (towel, sauna...) */
export const GET = route(async () => {
  const s = await requireGym("sales");
  return { items: await listExtras(s.gymId) };
});

/** POST /api/extras { name, price, active } (owner/manager) */
export const POST = route(async (req) => {
  const s = await requireGym("sales");
  const item = await createExtra(s, await readBody(req, extraItemSchema));
  await audit(s, "extra.create", "ExtraItem", item.id, `Added ${item.name} (QAR ${item.price}) to the extras price list`);
  return item;
});
