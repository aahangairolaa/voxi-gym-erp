import { route, readBody } from "@/server/http";
import { requireGym, requirePermission } from "@/server/auth";
import { ptPackageSchema } from "@/server/validators";
import { sellPackage } from "@/server/services/pt.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/pt/packages { memberId, trainerId, sessionsTotal, price, amountPaid, paymentMethod, soldById?, expiresAt?, name? } */
export const POST = route(async (req) => {
  const s = await requireGym("pt");
  await requirePermission(s, "payments");
  const r = await sellPackage(s, await readBody(req, ptPackageSchema));
  await audit(s, "pt.sell", "PtPackage", r.pkg.id, `Sold ${r.pkg.name} with ${r.trainerName} to ${r.memberName} (QAR ${r.pkg.price})`);
  return r;
});
