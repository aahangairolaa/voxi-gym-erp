import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { staffSchema } from "@/server/validators";
import { createStaff, listStaff } from "@/server/services/staff.service";
import { audit } from "@/server/services/audit.service";

export const GET = route(async () => {
  const s = await requireGym("staff");
  return { staff: await listStaff(s) };
});

export const POST = route(async (req) => {
  const s = await requireGym("staff");
  const st = await createStaff(await readBody(req, staffSchema), s);
  await audit(s, "staff.create", "Staff", st.id, `Added ${st.role.toLowerCase()} account for ${st.name}`);
  return st;
});
