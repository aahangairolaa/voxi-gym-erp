import { route, readBody } from "@/server/http";
import { requireGymRole } from "@/server/auth";
import { classSchema } from "@/server/validators";
import { deleteClass, updateClass } from "@/server/services/classes.service";
import { audit } from "@/server/services/audit.service";

type Params = { id: string };

export const PUT = route<Params>(async (req, { id }) => {
  const s = await requireGymRole("OWNER", "MANAGER", "TRAINER");
  return updateClass(s.gymId, id, await readBody(req, classSchema));
});

export const DELETE = route<Params>(async (_req, { id }) => {
  const s = await requireGymRole("OWNER", "MANAGER");
  const c = await deleteClass(s.gymId, id);
  await audit(s, "class.delete", "GymClass", id, `Deleted class ${c.name}`);
  return { ok: true };
});
