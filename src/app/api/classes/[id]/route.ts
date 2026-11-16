import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { classSchema } from "@/server/validators";
import { deleteClass, updateClass } from "@/server/services/classes.service";

type Params = { id: string };

export const PUT = route<Params>(async (req, { id }) => {
  await requireRole("OWNER", "MANAGER", "TRAINER");
  return updateClass(id, await readBody(req, classSchema));
});

export const DELETE = route<Params>(async (_req, { id }) => {
  await requireRole("OWNER", "MANAGER");
  return deleteClass(id);
});
