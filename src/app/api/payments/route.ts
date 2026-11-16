import { route, readBody, searchParams } from "@/server/http";
import { requireSession } from "@/server/auth";
import { endOfDay, fromDateInput } from "@/lib/dates";
import { paymentSchema } from "@/server/validators";
import { createPayment, listPayments } from "@/server/services/payments.service";

/** GET /api/payments?from=2026-11-01&to=2026-11-30&method=CASH&search=&memberId= */
export const GET = route(async (req) => {
  await requireSession("payments");
  const q = searchParams(req);
  return listPayments({
    from: q.get("from") ? fromDateInput(q.get("from")!) : null,
    to: q.get("to") ? endOfDay(fromDateInput(q.get("to")!)) : null,
    method: q.get("method"),
    search: q.get("search"),
    memberId: q.get("memberId"),
  });
});

/** POST /api/payments → record a payment (balance, PT, retail …) */
export const POST = route(async (req) => {
  const session = await requireSession("payments");
  return createPayment(await readBody(req, paymentSchema), session);
});
