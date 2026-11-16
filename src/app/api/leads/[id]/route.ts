import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { leadSchema } from "@/server/validators";
import { deleteLead, updateLead } from "@/server/services/leads.service";

type Params = { id: string };

/** PUT = full update, PATCH = change a few fields (e.g. drag to another column) */
export const PUT = route<Params>(async (req, { id }) => {
  await requireSession("leads");
  return updateLead(id, await readBody(req, leadSchema));
});

export const PATCH = route<Params>(async (req, { id }) => {
  await requireSession("leads");
  return updateLead(id, await readBody(req, leadSchema.partial()));
});

export const DELETE = route<Params>(async (_req, { id }) => {
  await requireSession("leads");
  return deleteLead(id);
});
