import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { ptSessionSchema } from "@/server/validators";
import { logSession } from "@/server/services/pt.service";

/** POST /api/pt/sessions { packageId, notes?, doneAt? } → one session done (trainers: their own clients) */
export const POST = route(async (req) => logSession(await requireGym("pt"), await readBody(req, ptSessionSchema)));
