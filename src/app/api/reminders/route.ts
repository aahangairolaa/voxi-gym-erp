import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { getReminders } from "@/server/services/engagement.service";

/** GET /api/reminders → members expiring soon / recently expired, with when they were last reminded */
export const GET = route(async () => {
  const s = await requireGym("dashboard");
  return getReminders(s.gymId);
});
