import { route } from "@/server/http";
import { clearSessionCookie } from "@/server/auth";

/** POST /api/auth/logout */
export const POST = route(async () => {
  await clearSessionCookie();
  return { ok: true };
});
