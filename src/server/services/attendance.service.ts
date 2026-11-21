import type { AccessSource } from "@prisma/client";
import { endOfDay, startOfDay } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../http";
import { effectiveStatus, fullName, getWarnDays, memberPhotoUrl, ownedOr404 } from "./_shared";

export type AccessResult = {
  allowed: boolean;
  action: "IN" | "OUT" | "DENIED";
  reason: string | null;
  member: { id: string; code: string; name: string; status: string; plan: string | null; endDate: Date | null; photoUrl: string | null };
  attendanceId: string | null;
};

/**
 * The single place where "a member arrives at the gym" is decided.
 * Used by the reception check-in screen AND by biometric devices.
 *  - If the member is already inside today → this scan checks them OUT.
 *  - Otherwise they are checked IN, but only with a valid membership
 *    (staff can override from the reception screen).
 */
export async function recordAccess(opts: {
  gymId: string;
  memberId: string;
  branchId?: string | null;
  source: AccessSource;
  deviceId?: string | null;
  override?: boolean;
  direction?: "in" | "out" | "auto";
  at?: Date;
}): Promise<AccessResult> {
  const at = opts.at ?? new Date();
  const warnDays = await getWarnDays(opts.gymId);
  const member = await db.member.findFirst({
    where: { id: opts.memberId, gymId: opts.gymId },
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      branchId: true,
      photoUpdatedAt: true,
      memberships: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { endDate: "desc" },
        take: 1,
        include: { plan: { select: { name: true } } },
      },
    },
  });
  if (!member) throw new ApiError(404, "Member not found.");

  const current = member.memberships[0] ?? null;
  const status = effectiveStatus(current, warnDays);
  const info = {
    id: member.id,
    code: member.code,
    name: fullName(member),
    status,
    plan: current?.plan.name ?? null,
    endDate: current?.endDate ?? null,
    photoUrl: memberPhotoUrl(member),
  };

  const openVisit = await db.attendance.findFirst({
    where: { gymId: opts.gymId, memberId: member.id, checkOutAt: null, checkInAt: { gte: startOfDay(at), lte: endOfDay(at) } },
    orderBy: { checkInAt: "desc" },
  });

  if (openVisit && opts.direction === "in") {
    return { allowed: true, action: "IN", reason: "Already checked in", member: info, attendanceId: openVisit.id };
  }

  // Check OUT
  if (openVisit) {
    await db.attendance.update({ where: { id: openVisit.id }, data: { checkOutAt: at } });
    return { allowed: true, action: "OUT", reason: null, member: info, attendanceId: openVisit.id };
  }
  if (!openVisit && opts.direction === "out") {
    return { allowed: true, action: "OUT", reason: "No open visit today", member: info, attendanceId: null };
  }

  // Check IN — needs a valid membership
  const valid = status === "ACTIVE" || status === "EXPIRING";
  if (!valid && !opts.override) {
    const reason =
      status === "FROZEN"
        ? "Membership is frozen"
        : status === "EXPIRED"
          ? "Membership has expired"
          : "No active membership";
    return { allowed: false, action: "DENIED", reason, member: info, attendanceId: null };
  }
  if (current && current.startDate > endOfDay(at) && !opts.override) {
    return { allowed: false, action: "DENIED", reason: "Membership hasn't started yet", member: info, attendanceId: null };
  }

  const visit = await db.attendance.create({
    data: {
      gymId: opts.gymId,
      memberId: member.id,
      branchId: opts.branchId ?? member.branchId,
      source: opts.source,
      deviceId: opts.deviceId ?? null,
      checkInAt: at,
    },
  });
  return { allowed: true, action: "IN", reason: valid ? null : "Admitted by staff override", member: info, attendanceId: visit.id };
}

/**
 * Find a member for the check-in box by: member code (M-1001 or 1001), phone,
 * biometric id, or the QR code on their digital card (a token or a full card URL).
 */
export async function findMemberForCheckIn(gymId: string, code: string) {
  const c = code.trim();
  const token = /\/c\/([A-Za-z0-9_-]{10,})/.exec(c)?.[1] ?? (/^[A-Za-z0-9_-]{20,}$/.test(c) ? c : null);
  if (token) {
    const byQr = await db.member.findFirst({ where: { gymId, qrToken: token }, select: { id: true } });
    if (byQr) return { id: byQr.id, via: "QR" as const };
  }
  const member = await db.member.findFirst({
    where: {
      gymId,
      OR: [
        { code: { equals: c, mode: "insensitive" } },
        { code: { equals: `M-${c}`, mode: "insensitive" } },
        { phone: { contains: c } },
        { biometricId: c },
      ],
    },
    select: { id: true },
  });
  if (!member) throw new ApiError(404, `No member found for "${c}".`);
  return { id: member.id, via: "MANUAL" as const };
}

export async function listAttendance(gymId: string, opts: { date?: Date | null; branchId?: string | null }) {
  const day = opts.date ?? new Date();
  const visits = await db.attendance.findMany({
    where: {
      gymId,
      checkInAt: { gte: startOfDay(day), lte: endOfDay(day) },
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
    },
    orderBy: { checkInAt: "desc" },
    include: {
      member: { select: { id: true, code: true, firstName: true, lastName: true, photoUpdatedAt: true } },
      branch: { select: { name: true } },
      device: { select: { name: true } },
    },
  });

  const finished = visits.filter((v) => v.checkOutAt);
  const avgMinutes = finished.length
    ? Math.round(finished.reduce((s, v) => s + (v.checkOutAt!.getTime() - v.checkInAt.getTime()) / 60000, 0) / finished.length)
    : 0;

  const byHour = Array.from({ length: 24 }, () => 0);
  visits.forEach((v) => {
    const h = (v.checkInAt.getUTCHours() + 3) % 24; // Qatar hour
    byHour[h]!++;
  });

  return {
    visits: visits.map((v) => ({
      id: v.id,
      member: { id: v.member.id, code: v.member.code, name: fullName(v.member), photoUrl: memberPhotoUrl(v.member) },
      branch: v.branch?.name ?? null,
      checkInAt: v.checkInAt,
      checkOutAt: v.checkOutAt,
      source: v.source,
      device: v.device?.name ?? null,
    })),
    stats: {
      total: visits.length,
      inside: visits.filter((v) => !v.checkOutAt).length,
      avgMinutes,
      biometric: visits.filter((v) => v.source === "BIOMETRIC").length,
    },
    byHour,
  };
}

export async function checkOut(gymId: string, id: string) {
  const v = ownedOr404(await db.attendance.findFirst({ where: { id, gymId } }), "Visit");
  if (v.checkOutAt) return v;
  return db.attendance.update({ where: { id }, data: { checkOutAt: new Date() } });
}
