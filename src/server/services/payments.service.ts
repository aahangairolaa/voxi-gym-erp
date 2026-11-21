import type { PaymentMethod, Prisma } from "@prisma/client";
import type { z } from "zod";
import { db, type Tx } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import type { paymentSchema } from "../validators";
import { fullName, nextNumber, ownedOr404 } from "./_shared";

type PaymentInput = z.infer<typeof paymentSchema>;

/**
 * Record a payment inside an existing transaction.
 * Cash payments are automatically attached to the open cash drawer of the branch.
 */
export async function createPaymentTx(
  tx: Tx,
  input: {
    memberId: string | null;
    membershipId: string | null;
    amount: number;
    method: PaymentMethod;
    description: string | null;
    reference: string | null;
    paidAt?: Date | null;
  },
  session: GymSession,
) {
  const gym = await tx.gym.findUnique({ where: { id: session.gymId }, select: { invoicePrefix: true } });
  const n = await nextNumber(tx, session.gymId, "invoice", 1);
  const invoiceNo = `${gym?.invoicePrefix ?? "INV"}-${String(n).padStart(6, "0")}`;

  let cashSessionId: string | null = null;
  if (input.method === "CASH") {
    const open = await tx.cashSession.findFirst({
      where: { gymId: session.gymId, status: "OPEN", ...(session.branchId ? { branchId: session.branchId } : {}) },
      orderBy: { openedAt: "desc" },
    });
    cashSessionId = open?.id ?? null;
  }

  return tx.payment.create({
    data: {
      gymId: session.gymId,
      invoiceNo,
      memberId: input.memberId,
      membershipId: input.membershipId,
      amount: input.amount,
      method: input.method,
      description: input.description,
      reference: input.reference,
      paidAt: input.paidAt ?? new Date(),
      receivedById: session.staffId,
      cashSessionId,
    },
  });
}

export async function createPayment(input: PaymentInput, session: GymSession) {
  if (input.membershipId) {
    const ms = ownedOr404(await db.membership.findFirst({ where: { id: input.membershipId, gymId: session.gymId } }), "Membership");
    input.memberId = ms.memberId;
  } else if (input.memberId) {
    ownedOr404(await db.member.findFirst({ where: { id: input.memberId, gymId: session.gymId }, select: { id: true } }), "Member");
  }
  return db.$transaction((tx) => createPaymentTx(tx, input, session));
}

export async function listPayments(gymId: string, opts: {
  from?: Date | null;
  to?: Date | null;
  method?: string | null;
  search?: string | null;
  memberId?: string | null;
}) {
  const where: Prisma.PaymentWhereInput = {
    gymId,
    ...(opts.from || opts.to ? { paidAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } } : {}),
    ...(opts.method && opts.method !== "ALL" ? { method: opts.method as PaymentMethod } : {}),
    ...(opts.memberId ? { memberId: opts.memberId } : {}),
    ...(opts.search
      ? {
          OR: [
            { invoiceNo: { contains: opts.search, mode: "insensitive" } },
            { member: { firstName: { contains: opts.search, mode: "insensitive" } } },
            { member: { lastName: { contains: opts.search, mode: "insensitive" } } },
            { member: { code: { contains: opts.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const payments = await db.payment.findMany({
    where,
    orderBy: { paidAt: "desc" },
    take: 500,
    include: {
      member: { select: { id: true, code: true, firstName: true, lastName: true } },
      membership: { select: { plan: { select: { name: true } } } },
      receivedBy: { select: { name: true } },
    },
  });

  const paid = payments.filter((p) => p.status === "PAID");
  const byMethod: Record<string, number> = {};
  paid.forEach((p) => (byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount));

  return {
    payments: payments.map((p) => ({
      id: p.id,
      invoiceNo: p.invoiceNo,
      amount: p.amount,
      method: p.method,
      status: p.status,
      description: p.description ?? (p.membership ? `${p.membership.plan.name} membership` : null),
      reference: p.reference,
      paidAt: p.paidAt,
      member: p.member ? { id: p.member.id, code: p.member.code, name: fullName(p.member) } : null,
      receivedBy: p.receivedBy?.name ?? null,
    })),
    totals: {
      collected: paid.reduce((s, p) => s + p.amount, 0),
      refunded: payments.filter((p) => p.status === "REFUNDED").reduce((s, p) => s + p.amount, 0),
      count: paid.length,
      byMethod,
    },
  };
}

/** Everything needed to print an invoice. */
export async function getInvoice(gymId: string, id: string) {
  const [payment, gym] = await Promise.all([
    db.payment.findFirst({
      where: { id, gymId },
      include: {
        member: { select: { code: true, firstName: true, lastName: true, phone: true, email: true, qid: true } },
        membership: { include: { plan: true } },
        receivedBy: { select: { name: true } },
      },
    }),
    db.gym.findUnique({
      where: { id: gymId },
      select: { name: true, legalName: true, crNumber: true, phone: true, email: true, address: true, website: true, logo: true, brandColor: true, invoiceFooter: true },
    }),
  ]);
  if (!payment) throw new ApiError(404, "Payment not found.");
  return { payment, settings: gym, gym };
}

export async function refundPayment(gymId: string, id: string) {
  const p = await db.payment.findFirst({ where: { id, gymId } });
  if (!p) throw new ApiError(404, "Payment not found.");
  if (p.status === "REFUNDED") throw new ApiError(400, "This payment is already refunded.");
  return db.payment.update({ where: { id }, data: { status: "REFUNDED" } });
}
