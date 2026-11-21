import { route, readBody, searchParams } from "@/server/http";
import { requireGym } from "@/server/auth";
import { endOfDay, fromDateInput } from "@/lib/dates";
import { paymentSchema } from "@/server/validators";
import { createPayment, listPayments } from "@/server/services/payments.service";
import { audit } from "@/server/services/audit.service";

/** GET /api/payments?from=2026-11-01&to=2026-11-30&method=CASH&search=&memberId= */
export const GET = route(async (req) => {
  const s = await requireGym("payments");
  const q = searchParams(req);
  return listPayments(s.gymId, {
    from: q.get("from") ? fromDateInput(q.get("from")!) : null,
    to: q.get("to") ? endOfDay(fromDateInput(q.get("to")!)) : null,
    method: q.get("method"),
    search: q.get("search"),
    memberId: q.get("memberId"),
  });
});

/** POST /api/payments → record a payment (balance, PT, retail …) */
export const POST = route(async (req) => {
  const s = await requireGym("payments");
  const p = await createPayment(await readBody(req, paymentSchema), s);
  await audit(s, "payment.create", "Payment", p.id, `Recorded ${p.invoiceNo}: QAR ${p.amount} by ${p.method.toLowerCase().replace("_", " ")}`);
  return p;
});
