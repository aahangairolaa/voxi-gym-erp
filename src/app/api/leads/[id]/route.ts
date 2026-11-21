import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { leadSchema } from "@/server/validators";
import { deleteLead, updateLead } from "@/server/services/leads.service";
import { audit } from "@/server/services/audit.service";

type Params = { id: string };

/** PUT = full update, PATCH = change a few fields (e.g. move to another column) */
export const PUT = route<Params>(async (req, { id }) => {
  const s = await requireGym("leads");
  return updateLead(s.gymId, id, await readBody(req, leadSchema));
});

export const PATCH = route<Params>(async (req, { id }) => {
  const s = await requireGym("leads");
  return updateLead(s.gymId, id, await readBody(req, leadSchema.partial()));
});

export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGym("leads");
  const l = await deleteLead(s.gymId, id);
  await audit(s, "lead.delete", "Lead", id, `Deleted lead ${l.name}`);
  return { ok: true };
});
