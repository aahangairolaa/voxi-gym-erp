import { z } from "zod";
import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { cancelPackage, reassignPackage } from "@/server/services/pt.service";
import { audit } from "@/server/services/audit.service";

const body = z.object({ action: z.enum(["cancel", "reassign"]), trainerId: z.string().optional() });

/** PATCH /api/pt/packages/:id { action: "cancel" } or { action: "reassign", trainerId } (owner/manager) */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const s = await requireGym("pt");
  const b = await readBody(req, body);
  if (b.action === "cancel") {
    const p = await cancelPackage(s, id);
    await audit(s, "pt.cancel", "PtPackage", id, `Cancelled PT package ${p.name}`);
    return p;
  }
  const p = await reassignPackage(s, id, b.trainerId ?? "");
  await audit(s, "pt.reassign", "PtPackage", id, `Moved PT package ${p.name} to another trainer`);
  return p;
});
