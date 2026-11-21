import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { leadSchema } from "@/server/validators";
import { createLead, listLeads } from "@/server/services/leads.service";

export const GET = route(async () => {
  const s = await requireGym("leads");
  return { leads: await listLeads(s.gymId) };
});

export const POST = route(async (req) => {
  const s = await requireGym("leads");
  return createLead(s.gymId, await readBody(req, leadSchema));
});
