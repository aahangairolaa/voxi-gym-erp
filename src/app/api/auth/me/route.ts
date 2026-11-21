import { route } from "@/server/http";
import { requireSession } from "@/server/auth";
import { currentUser } from "@/server/services/auth.service";

/** GET /api/auth/me → the logged-in staff member and their gym's name & branding */
export const GET = route(async () => currentUser(await requireSession()));
