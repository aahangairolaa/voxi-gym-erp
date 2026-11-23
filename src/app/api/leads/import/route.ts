import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { leadImportSchema } from "@/server/validators";
import { importLeads } from "@/server/services/leads.service";
import { audit } from "@/server/services/audit.service";

/** POST /api/leads/import { rows: [{ name, phone, email?, source?, interest?, notes? }], commit } → check first, then import */
export const POST = route(async (req) => {
  const s = await requireGym("leads");
  const r = await importLeads(s.gymId, await readBody(req, leadImportSchema));
  if (r.imported) await audit(s, "lead.import", "Lead", null, `Imported ${r.imported} leads`);
  return r;
});
