import { route } from "@/server/http";
import { forgetAccess, requireSession, setSessionCookie } from "@/server/auth";
import { signOutEverywhere } from "@/server/services/auth.service";

/** POST /api/auth/sessions — sign out on every other device (this one stays signed in) */
export const POST = route(async () => {
  const s = await requireSession();
  const fresh = await signOutEverywhere(s);
  forgetAccess(s.staffId);
  await setSessionCookie(fresh);
  return { ok: true };
});
