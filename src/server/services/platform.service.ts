/**
 * VOXI platform tools (SUPER_ADMIN only): database storage, exporting a gym's data,
 * permanently deleting a suspended gym, and announcements shown to gyms.
 */
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { ApiError } from "../http";

/** Tables that belong to a gym (they have a gymId), with their Postgres names. */
const GYM_TABLES = [
  "Branch", "Counter", "Staff", "Member", "Plan", "Membership", "Payment", "CashSession", "Expense", "Attendance",
  "BiometricDevice", "BiometricEvent", "Exercise", "WorkoutPlan", "WorkoutLog", "GymClass", "Lead", "WhatsAppMessage",
  "AuditLog", "CafeItem", "CafeSale", "ExtraItem", "PtPackage", "PtSession",
] as const;

// ── Storage ──────────────────────────────────────────────────────────────────
/**
 * How much space the database uses, and roughly how much of it each gym takes.
 * Photos are measured exactly; other tables are shared out by each gym's share of the rows.
 */
export async function storageReport() {
  const [[dbSize], tables] = await Promise.all([
    db.$queryRaw<{ bytes: bigint }[]>`SELECT pg_database_size(current_database())::bigint AS bytes`,
    db.$queryRaw<{ name: string; bytes: bigint; rows: bigint }[]>`
      SELECT c.relname::text AS name, pg_total_relation_size(c.oid) AS bytes, GREATEST(c.reltuples, 0)::bigint AS rows
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' AND n.nspname = current_schema()
      ORDER BY pg_total_relation_size(c.oid) DESC`,
  ]);
  const size = new Map(tables.map((t) => [t.name, Number(t.bytes)]));

  // Rows per gym in every gym table (exact counts)
  const perGym = new Map<string, number>(); // gymId -> estimated bytes
  for (const t of GYM_TABLES) {
    const rows = await db.$queryRawUnsafe<{ gymId: string | null; n: bigint }[]>(`SELECT "gymId", COUNT(*)::bigint AS n FROM "${t}" GROUP BY "gymId"`);
    const total = rows.reduce((a, r) => a + Number(r.n), 0);
    const bytes = size.get(t) ?? 0;
    if (!total || !bytes) continue;
    for (const r of rows) {
      if (!r.gymId) continue;
      perGym.set(r.gymId, (perGym.get(r.gymId) ?? 0) + (bytes * Number(r.n)) / total);
    }
  }

  // Photos: exact bytes per gym (members and staff)
  const photos = await db.$queryRaw<{ gymId: string; bytes: bigint; n: bigint }[]>`
    SELECT "gymId", SUM(octet_length(photo))::bigint AS bytes, COUNT(photo)::bigint AS n FROM "Member" WHERE photo IS NOT NULL GROUP BY "gymId"
    UNION ALL
    SELECT "gymId", SUM(octet_length(photo))::bigint AS bytes, COUNT(photo)::bigint AS n FROM "Staff" WHERE photo IS NOT NULL AND "gymId" IS NOT NULL GROUP BY "gymId"`;
  const photoBytes = new Map<string, { bytes: number; count: number }>();
  for (const p of photos) {
    const x = photoBytes.get(p.gymId) ?? { bytes: 0, count: 0 };
    x.bytes += Number(p.bytes);
    x.count += Number(p.n);
    photoBytes.set(p.gymId, x);
  }

  return {
    database: {
      bytes: Number(dbSize?.bytes ?? 0),
      tables: tables.slice(0, 8).map((t) => ({ name: t.name, bytes: Number(t.bytes), rows: Number(t.rows) })),
    },
    gyms: [...perGym.entries()]
      .map(([gymId, bytes]) => ({ gymId, bytes: Math.round(bytes), photoBytes: photoBytes.get(gymId)?.bytes ?? 0, photos: photoBytes.get(gymId)?.count ?? 0 }))
      .sort((a, b) => b.bytes - a.bytes),
  };
}

// ── Export ───────────────────────────────────────────────────────────────────
/** Everything a gym has in VOXI, as one JSON document (no passwords, no photos). */
export async function exportGym(gymId: string) {
  const gym = await db.gym.findUnique({ where: { id: gymId } });
  if (!gym) throw new ApiError(404, "Gym not found");
  const w = { where: { gymId } };
  const [
    branches, staff, members, plans, memberships, payments, cashSessions, expenses, attendance, leads, classes,
    workoutPlans, ptPackages, ptSessions, extraItems, cafeItems, cafeSales, auditLogs,
  ] = await Promise.all([
    db.branch.findMany(w),
    db.staff.findMany({ ...w, select: { id: true, name: true, email: true, phone: true, role: true, branchId: true, salary: true, isActive: true, cafeRole: true, lastLoginAt: true, createdAt: true } }),
    db.member.findMany({ ...w, omit: { photo: true, qrToken: true } }),
    db.plan.findMany(w),
    db.membership.findMany(w),
    db.payment.findMany(w),
    db.cashSession.findMany(w),
    db.expense.findMany(w),
    db.attendance.findMany(w),
    db.lead.findMany(w),
    db.gymClass.findMany(w),
    db.workoutPlan.findMany({ ...w, include: { items: true } }),
    db.ptPackage.findMany(w),
    db.ptSession.findMany(w),
    db.extraItem.findMany(w),
    db.cafeItem.findMany(w),
    db.cafeSale.findMany(w),
    db.auditLog.findMany({ ...w, orderBy: { createdAt: "desc" }, take: 5000 }),
  ]);
  const { rolePermissions, planRequest, platformNotes, ...gymInfo } = gym;
  return {
    exportedAt: new Date().toISOString(),
    note: "VOXI export. Photos and passwords are not included.",
    gym: { ...gymInfo, rolePermissions, planRequest, platformNotes },
    counts: {
      branches: branches.length, staff: staff.length, members: members.length, memberships: memberships.length, payments: payments.length,
      attendance: attendance.length, leads: leads.length, expenses: expenses.length, ptPackages: ptPackages.length,
    },
    branches, staff, members, plans, memberships, payments, cashSessions, expenses, attendance, leads, classes,
    workoutPlans, ptPackages, ptSessions, extraItems, cafeItems, cafeSales, auditLogs,
  };
}

// ── Delete ───────────────────────────────────────────────────────────────────
/**
 * Permanently delete a gym and everything in it. Only for suspended gyms, and only when
 * the exact gym name is typed to confirm. This can't be undone.
 */
export async function deleteGym(gymId: string, confirmName: string, deletedBy?: string) {
  const gym = await db.gym.findUnique({
    where: { id: gymId },
    select: { id: true, name: true, slug: true, status: true, _count: { select: { members: true } }, staff: { where: { role: "OWNER" }, take: 1, orderBy: { createdAt: "asc" }, select: { email: true } } },
  });
  if (!gym) throw new ApiError(404, "Gym not found");
  if (gym.status !== "SUSPENDED") throw new ApiError(400, "Suspend the gym first. Only suspended gyms can be deleted.");
  if (confirmName.trim().toLowerCase() !== gym.name.trim().toLowerCase()) throw new ApiError(400, "The name you typed doesn't match the gym's name.");

  await db.$transaction(
    async (tx) => {
      const w = { where: { gymId } };
      // Children first, so no link between two of the gym's own records blocks the delete
      await tx.classBooking.deleteMany({ where: { gymClass: { gymId } } });
      await tx.workoutItem.deleteMany({ where: { workoutPlan: { gymId } } });
      await tx.ptSession.deleteMany(w);
      await tx.payment.deleteMany(w);
      await tx.ptPackage.deleteMany(w);
      await tx.cafeSale.deleteMany(w);
      await tx.attendance.deleteMany(w);
      await tx.biometricEvent.deleteMany(w);
      await tx.workoutLog.deleteMany(w);
      await tx.membership.deleteMany(w);
      await tx.expense.deleteMany(w);
      await tx.cashSession.deleteMany(w);
      await tx.whatsAppMessage.deleteMany(w);
      await tx.lead.deleteMany(w);
      await tx.auditLog.deleteMany(w);
      await tx.workoutPlan.deleteMany(w);
      await tx.gymClass.deleteMany(w);
      await tx.member.deleteMany(w);
      await tx.passwordReset.deleteMany({ where: { staff: { gymId } } });
      await tx.staff.deleteMany(w);
      await tx.gym.delete({ where: { id: gymId } }); // the rest goes with the gym
      // Keep only a line saying it existed
      await tx.deletedGym.create({ data: { name: gym.name, slug: gym.slug, ownerEmail: gym.staff[0]?.email ?? null, members: gym._count.members, deletedBy: deletedBy ?? null } });
    },
    { timeout: 120_000 },
  );
  return { deleted: gym.name };
}

export async function listDeletedGyms() {
  return db.deletedGym.findMany({ orderBy: { deletedAt: "desc" }, take: 500 });
}

// ── Announcements ────────────────────────────────────────────────────────────
export async function listNotices() {
  return db.platformNotice.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export async function createNotice(input: { message: string; tone: string; audience: string; link?: string | null; endsAt?: Date | null }) {
  // One announcement at a time: posting a new one replaces the old
  await db.platformNotice.updateMany({ where: { active: true }, data: { active: false } });
  return db.platformNotice.create({ data: { ...input, active: true } });
}

export async function setNoticeActive(id: string, active: boolean) {
  if (active) await db.platformNotice.updateMany({ where: { active: true, id: { not: id } }, data: { active: false } });
  return db.platformNotice.update({ where: { id }, data: { active } });
}

/** The announcement a gym should see right now, if any. */
export async function activeNotice(gymStatus: string | null) {
  const n = await db.platformNotice.findFirst({
    where: { active: true, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
  });
  if (!n) return null;
  if (n.audience !== "ALL" && n.audience !== gymStatus) return null;
  return { id: n.id, message: n.message, tone: n.tone, link: n.link };
}

export type NoticeInput = Prisma.PlatformNoticeCreateInput;
