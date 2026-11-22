import { z } from "zod";
import { route, readBody } from "@/server/http";
import { requireGym } from "@/server/auth";
import { db } from "@/server/db";
import { findMemberForKiosk, recordAccess } from "@/server/services/attendance.service";

const schema = z.object({ code: z.string().trim().min(3, "Enter your member number or phone").max(300) });

/** GET /api/kiosk → what the self check-in screen shows (gym name, logo, colour) */
export const GET = route(async () => {
  const s = await requireGym("attendance");
  const gym = await db.gym.findUniqueOrThrow({ where: { id: s.gymId }, select: { name: true, logo: true, brandColor: true } });
  return { gym, staff: s.name };
});

/**
 * POST /api/kiosk { code } → a member checks themselves in (or out, if already inside).
 * Runs on the front-desk device under the staff account that opened the screen.
 * Never overrides: members without a valid plan are asked to see reception.
 */
export const POST = route(async (req) => {
  const s = await requireGym("attendance");
  const { code } = await readBody(req, schema);
  const found = await findMemberForKiosk(s.gymId, code);
  const r = await recordAccess({ gymId: s.gymId, memberId: found.id, branchId: s.branchId, source: found.via, override: false });
  // Only what a member should see on a shared screen
  return {
    action: r.action,
    allowed: r.allowed,
    reason: r.reason,
    member: {
      firstName: r.member.name.split(" ")[0],
      photoUrl: r.member.photoUrl,
      status: r.member.status,
      plan: r.member.plan,
      endDate: r.member.endDate,
    },
  };
});
