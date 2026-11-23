import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { undoSession } from "@/server/services/pt.service";
import { audit } from "@/server/services/audit.service";

/** DELETE /api/pt/sessions/:id → undo a session logged by mistake */
export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const s = await requireGym("pt");
  await undoSession(s, id);
  await audit(s, "pt.undo", "PtSession", id, "Undid a PT session");
  return { ok: true };
});
