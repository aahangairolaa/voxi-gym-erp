import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { leadSchema } from "@/server/validators";
import { createLead, listLeads } from "@/server/services/leads.service";

export const GET = route(async () => {
  await requireSession("leads");
  return { leads: await listLeads() };
});

export const POST = route(async (req) => {
  await requireSession("leads");
  return createLead(await readBody(req, leadSchema));
});
