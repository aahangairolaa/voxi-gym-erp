/**
 * Personal training: packages of sessions sold to members (who may be PT-only, without a membership),
 * sessions trainers log as they deliver them, and a trainer leaderboard.
 * Trainers only ever see and update their own clients.
 */
import type { z } from "zod";
import { allowed } from "@/lib/permissions";
import { startOfDay, startOfMonth } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import type { ptPackageSchema, ptSessionSchema } from "../validators";
import { checkSeller, fullName, memberPhotoUrl, ownedOr404 } from "./_shared";
import { createPaymentTx } from "./payments.service";

const MANAGERS = ["OWNER", "MANAGER"];
const isTrainer = (s: GymSession) => s.role === "TRAINER";

async function permsOf(gymId: string) {
  const g = await db.gym.findUnique({ where: { id: gymId }, select: { rolePermissions: true } });
  return (g?.rolePermissions ?? null) as Parameters<typeof allowed>[2];
}

export async function getPt(s: GymSession, opts: { trainerId?: string | null; status?: string | null }) {
  const perms = await permsOf(s.gymId);
  const showMoney = allowed(s.role, "revenue", perms) || allowed(s.role, "payments", perms);
  const trainerFilter = isTrainer(s) ? s.staffId : opts.trainerId || undefined;
  const monthStart = startOfMonth();
  const today = startOfDay();

  const [packages, recent, monthSessions, monthPayments, trainers, activeAll] = await Promise.all([
    db.ptPackage.findMany({
      where: {
        gymId: s.gymId,
        ...(trainerFilter ? { trainerId: trainerFilter } : {}),
        ...(opts.status === "all" ? {} : opts.status ? { status: opts.status } : { status: "ACTIVE" }),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true, name: true, sessionsTotal: true, sessionsUsed: true, price: true, status: true, expiresAt: true, createdAt: true, notes: true,
        member: { select: { id: true, firstName: true, lastName: true, code: true, phone: true, ptOnly: true, photoUpdatedAt: true } },
        trainer: { select: { id: true, name: true } },
        soldBy: { select: { name: true } },
        sessions: { orderBy: { doneAt: "desc" }, take: 1, select: { doneAt: true } },
        payments: { where: { status: "PAID" }, select: { amount: true } },
      },
    }),
    db.ptSession.findMany({
      where: { gymId: s.gymId, ...(trainerFilter ? { trainerId: trainerFilter } : {}) },
      orderBy: { doneAt: "desc" },
      take: 20,
      select: {
        id: true, doneAt: true, notes: true, createdById: true,
        member: { select: { id: true, firstName: true, lastName: true } },
        trainer: { select: { id: true, name: true } },
        package: { select: { id: true, name: true, sessionsUsed: true, sessionsTotal: true } },
      },
    }),
    db.ptSession.findMany({ where: { gymId: s.gymId, doneAt: { gte: monthStart } }, select: { trainerId: true, doneAt: true } }),
    db.payment.findMany({ where: { gymId: s.gymId, status: "PAID", paidAt: { gte: monthStart }, ptPackageId: { not: null } }, select: { amount: true, ptPackage: { select: { trainerId: true } } } }),
    db.staff.findMany({ where: { gymId: s.gymId, isActive: true, role: { in: ["TRAINER", "OWNER", "MANAGER"] } }, select: { id: true, name: true, role: true, photoUpdatedAt: true }, orderBy: { name: "asc" } }),
    db.ptPackage.findMany({ where: { gymId: s.gymId, status: "ACTIVE" }, select: { trainerId: true, memberId: true } }),
  ]);

  // Trainer leaderboard for this month
  const board = trainers
    .map((t) => {
      const sessions = monthSessions.filter((x) => x.trainerId === t.id).length;
      const clients = new Set(activeAll.filter((p) => p.trainerId === t.id).map((p) => p.memberId)).size;
      const revenue = monthPayments.filter((p) => p.ptPackage?.trainerId === t.id).reduce((a, p) => a + p.amount, 0);
      return { trainerId: t.id, name: t.name, role: t.role, sessions, clients, revenue: showMoney ? revenue : null };
    })
    .filter((r) => r.sessions > 0 || r.clients > 0 || r.role === "TRAINER")
    .sort((a, b) => b.sessions - a.sessions || b.clients - a.clients);

  const mine = (x: { trainerId: string | null }) => !trainerFilter || x.trainerId === trainerFilter;
  return {
    canSell: !isTrainer(s) && allowed(s.role, "payments", perms),
    canManage: MANAGERS.includes(s.role),
    isTrainer: isTrainer(s),
    me: s.staffId,
    showMoney,
    stats: {
      sessionsToday: monthSessions.filter((x) => mine(x) && x.doneAt >= today).length,
      sessionsThisMonth: monthSessions.filter(mine).length,
      activeClients: new Set(activeAll.filter(mine).map((p) => p.memberId)).size,
      revenueThisMonth: showMoney ? monthPayments.filter((p) => !trainerFilter || p.ptPackage?.trainerId === trainerFilter).reduce((a, p) => a + p.amount, 0) : null,
    },
    packages: packages.map((p) => ({
      id: p.id,
      name: p.name,
      sessionsTotal: p.sessionsTotal,
      sessionsUsed: p.sessionsUsed,
      sessionsLeft: p.sessionsTotal - p.sessionsUsed,
      status: p.status,
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
      notes: p.notes,
      price: showMoney ? p.price : null,
      paid: showMoney ? p.payments.reduce((a, x) => a + x.amount, 0) : null,
      lastSessionAt: p.sessions[0]?.doneAt ?? null,
      member: { id: p.member.id, name: fullName(p.member), code: p.member.code, ptOnly: p.member.ptOnly, photoUrl: memberPhotoUrl(p.member) },
      trainer: p.trainer,
      soldBy: p.soldBy?.name ?? null,
    })),
    recent: recent.map((r) => ({
      id: r.id,
      doneAt: r.doneAt,
      notes: r.notes,
      member: { id: r.member.id, name: fullName(r.member) },
      trainer: r.trainer,
      package: r.package,
      canUndo: MANAGERS.includes(s.role) || r.createdById === s.staffId,
    })),
    trainers: trainers.map((t) => ({ id: t.id, name: t.name, role: t.role })),
    board,
  };
}

/** Sell a PT package to a member, and take the payment. */
export async function sellPackage(s: GymSession, input: z.infer<typeof ptPackageSchema>) {
  if (isTrainer(s)) throw new ApiError(403, "Ask reception or a manager to sell PT packages.");
  const member = ownedOr404(await db.member.findFirst({ where: { id: input.memberId, gymId: s.gymId }, select: { id: true, firstName: true, lastName: true } }), "Member");
  const trainer = await db.staff.findFirst({ where: { id: input.trainerId, gymId: s.gymId, isActive: true }, select: { id: true, name: true } });
  if (!trainer) throw new ApiError(400, "Choose a trainer from your staff.");
  if (input.amountPaid > input.price) throw new ApiError(400, `Amount paid is more than the price (QAR ${input.price}).`);
  const soldById = await checkSeller(s.gymId, input.soldById);
  const name = input.name?.trim() || `${input.sessionsTotal} PT session${input.sessionsTotal === 1 ? "" : "s"}`;

  return db.$transaction(async (tx) => {
    const pkg = await tx.ptPackage.create({
      data: {
        gymId: s.gymId,
        memberId: member.id,
        trainerId: trainer.id,
        name,
        sessionsTotal: input.sessionsTotal,
        price: input.price,
        expiresAt: input.expiresAt ?? null,
        soldById,
        notes: input.notes ?? null,
      },
    });
    const payment =
      input.amountPaid > 0
        ? await createPaymentTx(
            tx,
            {
              memberId: member.id,
              membershipId: null,
              amount: input.amountPaid,
              method: input.paymentMethod,
              description: `${name} with ${trainer.name}`,
              reference: null,
              soldById,
              ptPackageId: pkg.id,
            },
            s,
          )
        : null;
    return { pkg, payment, memberName: fullName(member), trainerName: trainer.name };
  });
}

/** A trainer marks one session as done. */
export async function logSession(s: GymSession, input: z.infer<typeof ptSessionSchema>) {
  const pkg = ownedOr404(await db.ptPackage.findFirst({ where: { id: input.packageId, gymId: s.gymId } }), "PT package");
  if (isTrainer(s) && pkg.trainerId !== s.staffId) throw new ApiError(403, "This client trains with another trainer.");
  if (pkg.status !== "ACTIVE") throw new ApiError(400, "This package isn't active any more.");
  if (pkg.sessionsUsed >= pkg.sessionsTotal) throw new ApiError(400, "All sessions in this package are used. Sell a new package to continue.");
  if (input.doneAt && input.doneAt.getTime() > Date.now() + 60_000) throw new ApiError(400, "A session can't be in the future.");

  return db.$transaction(async (tx) => {
    // Only count it if a session is still left (two taps at once)
    const r = await tx.ptPackage.updateMany({
      where: { id: pkg.id, sessionsUsed: { lt: pkg.sessionsTotal } },
      data: { sessionsUsed: { increment: 1 } },
    });
    if (!r.count) throw new ApiError(409, "All sessions in this package are used.");
    const used = pkg.sessionsUsed + 1;
    if (used >= pkg.sessionsTotal) await tx.ptPackage.update({ where: { id: pkg.id }, data: { status: "COMPLETED" } });
    const session = await tx.ptSession.create({
      data: {
        gymId: s.gymId,
        packageId: pkg.id,
        memberId: pkg.memberId,
        trainerId: pkg.trainerId ?? (isTrainer(s) ? s.staffId : null),
        doneAt: input.doneAt ?? new Date(),
        notes: input.notes ?? null,
        createdById: s.staffId,
      },
    });
    return { session, sessionsUsed: used, sessionsTotal: pkg.sessionsTotal, completed: used >= pkg.sessionsTotal };
  });
}

/** Undo a session logged by mistake (the trainer who logged it, or a manager). */
export async function undoSession(s: GymSession, id: string) {
  const ses = ownedOr404(await db.ptSession.findFirst({ where: { id, gymId: s.gymId }, include: { package: true } }), "Session");
  if (!MANAGERS.includes(s.role) && ses.createdById !== s.staffId) throw new ApiError(403, "Only the person who logged it or a manager can undo a session.");
  await db.$transaction([
    db.ptSession.delete({ where: { id } }),
    db.ptPackage.update({
      where: { id: ses.packageId },
      data: { sessionsUsed: { decrement: 1 }, ...(ses.package.status === "COMPLETED" ? { status: "ACTIVE" } : {}) },
    }),
  ]);
  return ses;
}

/** Cancel a package (owner/manager). Sessions already used stay on record. */
export async function cancelPackage(s: GymSession, id: string) {
  if (!MANAGERS.includes(s.role)) throw new ApiError(403, "Only the owner or a manager can cancel a PT package.");
  const pkg = ownedOr404(await db.ptPackage.findFirst({ where: { id, gymId: s.gymId } }), "PT package");
  return db.ptPackage.update({ where: { id: pkg.id }, data: { status: "CANCELLED" } });
}

/** Move a client to another trainer (owner/manager). */
export async function reassignPackage(s: GymSession, id: string, trainerId: string) {
  if (!MANAGERS.includes(s.role)) throw new ApiError(403, "Only the owner or a manager can change the trainer.");
  ownedOr404(await db.ptPackage.findFirst({ where: { id, gymId: s.gymId }, select: { id: true } }), "PT package");
  const t = await db.staff.findFirst({ where: { id: trainerId, gymId: s.gymId, isActive: true }, select: { id: true } });
  if (!t) throw new ApiError(400, "Choose a trainer from your staff.");
  return db.ptPackage.update({ where: { id }, data: { trainerId } });
}
