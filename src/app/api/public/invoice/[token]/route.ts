import { route } from "@/server/http";
import { getPublicInvoice } from "@/server/services/payments.service";

/** GET /api/public/invoice/:token → an invoice shared with a member (no sign-in; the token is signed) */
export const GET = route<{ token: string }>(async (_req, { token }) => getPublicInvoice(token));
