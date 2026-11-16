import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { getInvoice } from "@/server/services/payments.service";

/** GET /api/payments/:id → invoice data */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  await requireSession("payments");
  return getInvoice(id);
});
