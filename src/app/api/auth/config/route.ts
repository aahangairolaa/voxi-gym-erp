import { route } from "@/server/http";
import { emailEnabled } from "@/server/email";
import { googleEnabled } from "@/server/services/auth.service";

/** GET /api/auth/config (public) — which sign-in options the login/register pages should show */
export const GET = route(async () => ({
  google: googleEnabled(),
  signup: process.env.ALLOW_SIGNUP !== "false",
  passwordReset: emailEnabled(),
  database: !!process.env.DATABASE_URL,
}));
