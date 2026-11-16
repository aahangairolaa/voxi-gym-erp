import { route, readBody } from "@/server/http";
import { requireSession } from "@/server/auth";
import { deviceSchema } from "@/server/validators";
import { deleteDevice, updateDevice } from "@/server/services/biometric.service";

type Params = { id: string };

export const PUT = route<Params>(async (req, { id }) => {
  await requireSession("biometric");
  return updateDevice(id, await readBody(req, deviceSchema));
});

export const DELETE = route<Params>(async (_req, { id }) => {
  await requireSession("biometric");
  return deleteDevice(id);
});
