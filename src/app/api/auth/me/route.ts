import { route } from "@/server/http";
import { requireSession } from "@/server/auth";

/** GET /api/auth/me → the logged-in staff member */
export const GET = route(async () => ({ user: await requireSession() }));
