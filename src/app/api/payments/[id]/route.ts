import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getInvoice } from "@/server/services/payments.service";

/** GET /api/payments/:id → invoice data (with the gym's profile & logo) */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("payments");
  return getInvoice(s.gymId, id);
});
