/**
 * Activity log: records who did what (sales, refunds, deletes, edits …).
 *   await audit(session, "payment.refund", "Payment", id, "Refunded INV-000123 (QAR 550)")
 * Logging never breaks the action it describes — failures are only printed.
 */
import { db } from "../db";
import type { GymSession } from "../auth";

export async function audit(session: GymSession, action: string, entity: string | null, entityId: string | null, summary: string) {
  try {
    await db.auditLog.create({
      data: { gymId: session.gymId, staffId: session.staffId, action, entity, entityId, summary },
    });
  } catch (e) {
    console.error("[audit] failed to record", action, e);
  }
}

export async function listActivity(gymId: string, opts: { staffId?: string | null; area?: string | null; limit?: number }) {
  const rows = await db.auditLog.findMany({
    where: {
      gymId,
      ...(opts.staffId ? { staffId: opts.staffId } : {}),
      ...(opts.area ? { action: { startsWith: `${opts.area}.` } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.limit ?? 200, 500),
    include: { staff: { select: { id: true, name: true, role: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    summary: r.summary,
    createdAt: r.createdAt,
    staff: r.staff,
  }));
}
