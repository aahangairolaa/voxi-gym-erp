import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getCelebrations } from "@/server/services/engagement.service";

/** GET /api/celebrations → birthdays this week and visit milestones */
export const GET = route(async () => {
  const s = await requireGym("dashboard");
  return getCelebrations(s.gymId);
});
