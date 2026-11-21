import { z } from "zod";
import { route, readBody } from "@/server/http";
import { requireGymRole } from "@/server/auth";
import { IMPORT_FIELDS, importMembers } from "@/server/services/import.service";
import { audit } from "@/server/services/audit.service";

const rowSchema = z.object(Object.fromEntries(IMPORT_FIELDS.map((f) => [f, z.string().max(1000).optional()])) as Record<(typeof IMPORT_FIELDS)[number], z.ZodOptional<z.ZodString>>);
const schema = z.object({
  rows: z.array(rowSchema).min(1).max(3000),
  branchId: z.string().nullable().optional(),
  dryRun: z.boolean().default(false),
});

/** POST /api/members/import { rows, branchId?, dryRun? } — owner & manager */
export const POST = route(async (req) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  const { rows, branchId, dryRun } = await readBody(req, schema);
  const r = await importMembers(s, rows, { branchId: branchId ?? null, dryRun });
  if (!dryRun && r.created) await audit(s, "member.import", null, null, `Imported ${r.created} members from a spreadsheet${r.skipped.length ? ` (${r.skipped.length} skipped)` : ""}`);
  return r;
});
