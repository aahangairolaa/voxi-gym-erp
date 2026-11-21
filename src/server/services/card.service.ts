/**
 * Digital member card (public). Anyone with the card link sees the member's
 * name, photo, plan and QR code — the link token is long and random, and staff
 * can issue a new one at any time (old links stop working).
 */
import { db } from "../db";
import { ApiError } from "../http";
import { effectiveStatus, getWarnDays } from "./_shared";

export async function getCard(token: string) {
  const m = await db.member.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      gymId: true,
      code: true,
      firstName: true,
      lastName: true,
      photoUpdatedAt: true,
      qrToken: true,
      gym: { select: { name: true, logo: true, brandColor: true, status: true, phone: true } },
      memberships: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { endDate: "desc" },
        take: 1,
        select: { status: true, startDate: true, endDate: true, plan: { select: { name: true, color: true } } },
      },
    },
  });
  if (!m || m.gym.status === "SUSPENDED") throw new ApiError(404, "This card link isn't valid any more. Ask reception for a new one.");
  const ms = m.memberships[0] ?? null;
  return {
    name: `${m.firstName} ${m.lastName}`.trim(),
    firstName: m.firstName,
    code: m.code,
    token: m.qrToken,
    photoUrl: m.photoUpdatedAt ? `/api/card/${m.qrToken}/photo?v=${m.photoUpdatedAt.getTime()}` : null,
    gym: { name: m.gym.name, logo: m.gym.logo, brandColor: m.gym.brandColor, phone: m.gym.phone },
    membership: ms ? { plan: ms.plan.name, color: ms.plan.color, endDate: ms.endDate, status: effectiveStatus(ms, await getWarnDays(m.gymId)) } : null,
  };
}

export async function getCardPhoto(token: string) {
  const m = await db.member.findUnique({ where: { qrToken: token }, select: { photo: true } });
  const match = m?.photo ? /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(m.photo) : null;
  return match ? { contentType: match[1]!, bytes: Buffer.from(match[2]!, "base64") } : null;
}
