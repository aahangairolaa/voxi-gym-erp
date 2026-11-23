/**
 * The VOXI team's own activity log: who created, activated, suspended or deleted a gym,
 * made a promo code or posted an announcement. Logging never breaks the action itself.
 */
import { db } from "../db";

export async function logAdmin(actor: string, action: string, summary: string, gymName?: string | null) {
  try {
    await db.adminLog.create({ data: { actor, action, summary, gymName: gymName ?? null } });
  } catch (e) {
    console.error("[admin-log] failed to record", action, e);
  }
}

export async function listAdminLog(opts: { action?: string | null; limit?: number } = {}) {
  return db.adminLog.findMany({
    where: opts.action ? { action: { startsWith: opts.action } } : {},
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.limit ?? 300, 1000),
  });
}
