import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { staffSchema } from "@/server/validators";
import { createStaff, listStaff } from "@/server/services/staff.service";

export const GET = route(async () => {
  const session = await requireSession("staff");
  return { staff: await listStaff(session) };
});

export const POST = route(async (req) => {
  const session = await requireSession("staff");
  return createStaff(await readBody(req, staffSchema), session);
});
