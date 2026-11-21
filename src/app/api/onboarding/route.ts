import { route } from "@/server/http";
import { requireGymRole } from "@/server/auth";
import { dismissOnboarding, getOnboarding } from "@/server/services/onboarding.service";

/** GET /api/onboarding → the "Get started" checklist (owner & manager) */
export const GET = route(async () => {
  const s = await requireGymRole("OWNER", "MANAGER");
  return getOnboarding(s.gymId);
});

/** DELETE /api/onboarding → hide the checklist */
export const DELETE = route(async () => {
  const s = await requireGymRole("OWNER", "MANAGER");
  return dismissOnboarding(s.gymId);
});
