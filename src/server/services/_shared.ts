/**
 * Small helpers shared by several services.
 */
import type { MembershipStatus } from "@prisma/client";
import type { MemberStatus } from "@/lib/constants";
import { addDays, startOfDay } from "@/lib/dates";
import type { Tx } from "../db";
import { db } from "../db";
import { ApiError } from "../http";

/** Get the next number from a gym's named counter (atomic, safe with many users). */
export async function nextNumber(tx: Tx, gymId: string, key: string, start: number): Promise<number> {
  const counter = await tx.counter.upsert({
    where: { gymId_key: { gymId, key } },
    create: { gymId, key, value: start },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}

type MembershipLike = { status: MembershipStatus; startDate: Date; endDate: Date };

/**
 * Work out a member's real status from their most recent membership.
 * (A membership saved as ACTIVE whose end date has passed is really EXPIRED.)
 */
export function effectiveStatus(m: MembershipLike | null | undefined, warnDays = 7): MemberStatus {
  if (!m || m.status === "CANCELLED") return "NONE";
  if (m.status === "FROZEN") return "FROZEN";
  const today = startOfDay();
  if (m.status === "EXPIRED" || m.endDate < today) return "EXPIRED";
  if (m.endDate < addDays(today, warnDays + 1)) return "EXPIRING";
  return "ACTIVE";
}

export function daysLeft(endDate: Date) {
  return Math.ceil((endDate.getTime() - Date.now()) / 86_400_000);
}

const warnDaysCache = new Map<string, { value: number; at: number }>();
/** A gym's "expiring soon" window from its settings (cached for a minute). */
export async function getWarnDays(gymId: string): Promise<number> {
  const hit = warnDaysCache.get(gymId);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  const g = await db.gym.findUnique({ where: { id: gymId }, select: { expiryWarnDays: true } });
  const value = g?.expiryWarnDays ?? 7;
  warnDaysCache.set(gymId, { value, at: Date.now() });
  return value;
}

/** Throw a 404 unless the record exists AND belongs to this gym. */
export function ownedOr404<T>(record: T | null | undefined, what = "Record"): T {
  if (!record) throw new ApiError(404, `${what} not found.`);
  return record;
}

/** Photo URL for a member (served by /api/members/:id/photo), or null. */
export function memberPhotoUrl(m: { id: string; photoUpdatedAt?: Date | null }) {
  return m.photoUpdatedAt ? `/api/members/${m.id}/photo?v=${m.photoUpdatedAt.getTime()}` : null;
}

export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

/** Turns rows into CSV text (for report exports). */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

/** "Sold by" must be someone on this gym's staff. Returns the id, or null for none. */
export async function checkSeller(gymId: string, staffId: string | null | undefined): Promise<string | null> {
  if (!staffId) return null;
  const s = await db.staff.findFirst({ where: { id: staffId, gymId }, select: { id: true } });
  if (!s) throw new ApiError(400, "Choose someone from your staff for “Sold by”.");
  return s.id;
}
