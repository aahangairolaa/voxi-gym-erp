/**
 * Extras: small services charged on top of memberships, e.g. towel, sauna session, locker.
 * Charging an extra records a normal payment, so it counts in revenue, the cash drawer and reports.
 */
import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import type { extraChargeSchema, extraItemSchema } from "../validators";
import { checkSeller, ownedOr404 } from "./_shared";
import { createPaymentTx } from "./payments.service";

/** Starter price list a gym gets the first time it opens Extras (it can change or remove them). */
const STARTERS = [
  { name: "Towel", price: 10 },
  { name: "Sauna session", price: 50 },
  { name: "Steam room session", price: 50 },
  { name: "Locker (day)", price: 15 },
  { name: "Day pass", price: 100 },
  { name: "Body composition scan", price: 75 },
];

export async function listExtras(gymId: string) {
  let items = await db.extraItem.findMany({ where: { gymId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  if (items.length === 0) {
    const gym = await db.gym.findUnique({ where: { id: gymId }, select: { extrasSeeded: true } });
    if (gym && !gym.extrasSeeded) {
      await db.extraItem.createMany({ data: STARTERS.map((s, i) => ({ ...s, gymId, sortOrder: i })) });
      await db.gym.update({ where: { id: gymId }, data: { extrasSeeded: true } });
      items = await db.extraItem.findMany({ where: { gymId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    }
  }
  return items;
}

const MANAGERS = ["OWNER", "MANAGER"];
function requireManager(s: GymSession) {
  if (!MANAGERS.includes(s.role)) throw new ApiError(403, "Only the owner or a manager can change the extras price list.");
}

export async function createExtra(s: GymSession, input: z.infer<typeof extraItemSchema>) {
  requireManager(s);
  const count = await db.extraItem.count({ where: { gymId: s.gymId } });
  if (count >= 50) throw new ApiError(400, "That's a lot of extras. Remove some before adding more.");
  return db.extraItem.create({ data: { ...input, gymId: s.gymId, sortOrder: count } });
}

export async function updateExtra(s: GymSession, id: string, input: z.infer<typeof extraItemSchema>) {
  requireManager(s);
  ownedOr404(await db.extraItem.findFirst({ where: { id, gymId: s.gymId }, select: { id: true } }), "Extra");
  return db.extraItem.update({ where: { id }, data: input });
}

export async function deleteExtra(s: GymSession, id: string) {
  requireManager(s);
  ownedOr404(await db.extraItem.findFirst({ where: { id, gymId: s.gymId }, select: { id: true } }), "Extra");
  await db.extraItem.delete({ where: { id } });
}

/** Charge an extra to a member (or a walk-in when no member is chosen). */
export async function chargeExtra(s: GymSession, input: z.infer<typeof extraChargeSchema>) {
  const item = ownedOr404(await db.extraItem.findFirst({ where: { id: input.extraItemId, gymId: s.gymId } }), "Extra");
  if (!item.active) throw new ApiError(400, `${item.name} is switched off in your price list.`);
  if (input.memberId) ownedOr404(await db.member.findFirst({ where: { id: input.memberId, gymId: s.gymId }, select: { id: true } }), "Member");
  const soldById = await checkSeller(s.gymId, input.soldById);
  const amount = item.price * input.quantity;
  const payment = await db.$transaction((tx) =>
    createPaymentTx(
      tx,
      {
        memberId: input.memberId ?? null,
        membershipId: null,
        amount,
        method: input.method,
        description: `${input.quantity > 1 ? `${input.quantity} × ` : ""}${item.name}`,
        reference: input.reference ?? null,
        soldById,
        extraItemId: item.id,
        quantity: input.quantity,
      },
      s,
    ),
  );
  return { payment, item };
}
