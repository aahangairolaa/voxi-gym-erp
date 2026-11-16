/**
 * Small helpers shared by several services.
 */
import type { MembershipStatus } from "@prisma/client";
import type { MemberStatus } from "@/lib/constants";
import { addDays, startOfDay } from "@/lib/dates";
import type { Tx } from "../db";
import { db } from "../db";

/** Get the next number from a named counter (atomic, safe with many users). */
export async function nextNumber(tx: Tx, key: string, start: number): Promise<number> {
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: start },
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

let cachedWarnDays: { value: number; at: number } | null = null;
/** The "expiring soon" window from settings (cached for a minute). */
export async function getWarnDays(): Promise<number> {
  if (cachedWarnDays && Date.now() - cachedWarnDays.at < 60_000) return cachedWarnDays.value;
  const s = await db.gymSettings.findUnique({ where: { id: "default" }, select: { expiryWarnDays: true } });
  cachedWarnDays = { value: s?.expiryWarnDays ?? 7, at: Date.now() };
  return cachedWarnDays.value;
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
