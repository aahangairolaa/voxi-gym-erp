import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { voidSale } from "@/server/services/cafe.service";
import { audit } from "@/server/services/audit.service";

/** DELETE /api/cafe/sales/:id → void a sale and put the stock back (owner/manager) */
export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("cafe");
  const sale = await voidSale(s, id);
  await audit(s, "cafe.sale.void", "CafeSale", id, `Voided a café sale of QAR ${sale.total}`);
  return { ok: true };
});
