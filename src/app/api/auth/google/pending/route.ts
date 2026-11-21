import { cookies } from "next/headers";
import { route } from "@/server/http";
import { GOOGLE_SIGNUP_COOKIE, readSignup } from "@/server/google";

/** GET /api/auth/google/pending (public) — the Google name & email waiting to finish sign-up */
export const GET = route(async () => {
  const p = await readSignup((await cookies()).get(GOOGLE_SIGNUP_COOKIE)?.value);
  return p ? { email: p.email, name: p.name } : { email: null, name: null };
});
