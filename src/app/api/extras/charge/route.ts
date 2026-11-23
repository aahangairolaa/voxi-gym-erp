import { route, readBody } from "@/server/http";
import { requireGym, requirePermission } from "@/server/auth";
import { extraChargeSchema } from "@/server/validators";
import { chargeExtra } from "@/server/services/extras.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/extras/charge { extraItemId, quantity, memberId?, method, soldById? } → records the payment */
export const POST = route(async (req) => {
  const s = await requireGym("sales");
  await requirePermission(s, "payments");
  const { payment, item } = await chargeExtra(s, await readBody(req, extraChargeSchema));
  await audit(s, "extra.charge", "Payment", payment.id, `Charged ${payment.description} (QAR ${payment.amount}), ${payment.invoiceNo}`);
  return { ...payment, item: item.name };
});
