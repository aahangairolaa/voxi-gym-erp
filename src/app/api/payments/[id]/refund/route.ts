import { route } from "@/server/http";
import { requireRole } from "@/server/auth";
import { refundPayment } from "@/server/services/payments.service";

/** POST /api/payments/:id/refund  (owner & manager) */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  await requireRole("OWNER", "MANAGER");
  return refundPayment(id);
});
