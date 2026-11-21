import { route } from "@/server/http";
import { requireGymRole } from "@/server/auth";
import { refundPayment } from "@/server/services/payments.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/payments/:id/refund  (owner & manager) */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  const p = await refundPayment(s.gymId, id);
  await audit(s, "payment.refund", "Payment", id, `Refunded ${p.invoiceNo} (QAR ${p.amount})`);
  return p;
});
