import { z } from "zod";
import { route, readBody } from "@/server/http";
import { forgetAccess, requireRole } from "@/server/auth";
import { updateGymSchema } from "@/server/validators";
import { updateGym } from "@/server/services/admin.service";
import { deleteGym } from "@/server/services/platform.service";
import { logAdmin } from "@/server/services/admin-log.service";
import { db } from "@/server/db";
import { formatDate } from "@/lib/format";

/** PUT /api/admin/gyms/:id  { plan?, status?, trialEndsAt?, platformNotes?, name? } */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  const s = await requireRole("SUPER_ADMIN");
  const input = await readBody(req, updateGymSchema);
  const before = await db.gym.findUnique({ where: { id }, select: { status: true, paidUntil: true } });
  const g = await updateGym(id, input);
  forgetAccess(); // status / trial changes apply to signed-in staff right away
  // A plain-English line for the admin activity log
  const what = input.applyRequest
    ? ["gym.activate", `Activated ${g.name}'s requested plan`]
    : input.declineRequest
      ? ["gym.decline", `Declined ${g.name}'s plan request`]
      : before && input.status && input.status !== before.status
        ? [`gym.${input.status.toLowerCase()}`, input.status === "SUSPENDED" ? `Suspended ${g.name}` : `Set ${g.name} to ${input.status === "ACTIVE" ? "active" : "free trial"}`]
        : before && g.paidUntil && String(g.paidUntil) !== String(before.paidUntil)
          ? ["gym.paid", `${g.name} paid until ${formatDate(g.paidUntil)}`]
          : ["gym.update", `Updated ${g.name}`];
  await logAdmin(s.name, what[0]!, what[1]!, g.name);
  return g;
});

/** DELETE /api/admin/gyms/:id { confirmName } → permanently deletes a SUSPENDED gym and all its data */
export const DELETE = route<{ id: string }>(async (req, { id }) => {
  const s = await requireRole("SUPER_ADMIN");
  const { confirmName } = await readBody(req, z.object({ confirmName: z.string().min(1, "Type the gym's name to confirm") }));
  const r = await deleteGym(id, confirmName, s.name);
  await logAdmin(s.name, "gym.delete", `Deleted ${r.deleted} and all its data`, r.deleted);
  forgetAccess(); // sign its staff out everywhere
  return r;
});
