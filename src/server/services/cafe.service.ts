/**
 * VOXI Café: a paid add-on for gyms that run their own café.
 * Menu (up to 14 items), selling at the counter, today's takings and the café team.
 * Until the gym pays for it, GET returns { enabled: false } and the page shows a locked preview;
 * every change is refused with 402.
 */
import type { z } from "zod";
import type { Prisma } from "@prisma/client";
import { MAX_CAFE_ITEMS, cafePrice } from "@/lib/pricing";
import { startOfDay } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import type { cafeItemSchema, cafeSaleSchema } from "../validators";

export const CAFE_LOCKED_MESSAGE = "VOXI Café is a paid add-on. Add it from Billing to unlock it.";
const MANAGERS = ["OWNER", "MANAGER"];

type SaleLine = { itemId: string; name: string; price: number; qty: number };

async function cafeOn(gymId: string) {
  const g = await db.gym.findUniqueOrThrow({ where: { id: gymId }, select: { cafeEnabled: true, billingMonths: true } });
  return g;
}

/** Throws 402 unless the gym has paid for the café. */
export async function requireCafe(gymId: string) {
  const g = await cafeOn(gymId);
  if (!g.cafeEnabled) throw new ApiError(402, CAFE_LOCKED_MESSAGE);
}

function requireManager(s: GymSession) {
  if (!MANAGERS.includes(s.role)) throw new ApiError(403, "Only the owner or a manager can change the café menu and team.");
}

export async function getCafe(s: GymSession) {
  const g = await cafeOn(s.gymId);
  if (!g.cafeEnabled) {
    return { enabled: false as const, price: cafePrice(12), priceForTerm: cafePrice(g.billingMonths), maxItems: MAX_CAFE_ITEMS };
  }
  const since = startOfDay();
  const [items, todays, recent, team, staff] = await Promise.all([
    db.cafeItem.findMany({ where: { gymId: s.gymId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.cafeSale.findMany({ where: { gymId: s.gymId, createdAt: { gte: since } }, select: { total: true, method: true, items: true } }),
    db.cafeSale.findMany({
      where: { gymId: s.gymId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true, total: true, method: true, items: true, createdAt: true,
        member: { select: { id: true, firstName: true, lastName: true } },
        soldBy: { select: { name: true } },
      },
    }),
    db.staff.findMany({ where: { gymId: s.gymId, isActive: true, cafeRole: { not: null } }, select: { id: true, name: true, cafeRole: true, role: true }, orderBy: { name: "asc" } }),
    MANAGERS.includes(s.role)
      ? db.staff.findMany({ where: { gymId: s.gymId, isActive: true, role: { not: "OWNER" } }, select: { id: true, name: true, role: true, cafeRole: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  // Today's best sellers
  const counts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const sale of todays) {
    for (const l of sale.items as SaleLine[]) {
      const c = counts.get(l.itemId) ?? { name: l.name, qty: 0, revenue: 0 };
      c.qty += l.qty;
      c.revenue += l.qty * l.price;
      counts.set(l.itemId, c);
    }
  }
  const byMethod = (m: string) => todays.filter((t) => t.method === m).reduce((a, t) => a + t.total, 0);

  return {
    enabled: true as const,
    maxItems: MAX_CAFE_ITEMS,
    items,
    today: {
      sales: todays.length,
      total: todays.reduce((a, t) => a + t.total, 0),
      cash: byMethod("CASH"),
      card: byMethod("CARD"),
      transfer: byMethod("TRANSFER"),
      top: [...counts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
    },
    recent,
    team,
    staff,
  };
}

// ── Menu ─────────────────────────────────────────────────────────────────────
export async function createItem(s: GymSession, input: z.infer<typeof cafeItemSchema>) {
  requireManager(s);
  await requireCafe(s.gymId);
  const count = await db.cafeItem.count({ where: { gymId: s.gymId } });
  if (count >= MAX_CAFE_ITEMS) throw new ApiError(400, `The café menu holds up to ${MAX_CAFE_ITEMS} items. Remove one to add another.`);
  return db.cafeItem.create({ data: { ...input, gymId: s.gymId, sortOrder: count } });
}

export async function updateItem(s: GymSession, id: string, input: z.infer<typeof cafeItemSchema>) {
  requireManager(s);
  await requireCafe(s.gymId);
  const found = await db.cafeItem.findFirst({ where: { id, gymId: s.gymId }, select: { id: true } });
  if (!found) throw new ApiError(404, "Item not found.");
  return db.cafeItem.update({ where: { id }, data: input });
}

export async function deleteItem(s: GymSession, id: string) {
  requireManager(s);
  await requireCafe(s.gymId);
  const { count } = await db.cafeItem.deleteMany({ where: { id, gymId: s.gymId } });
  if (!count) throw new ApiError(404, "Item not found.");
}

// ── Selling ──────────────────────────────────────────────────────────────────
export async function sell(s: GymSession, input: z.infer<typeof cafeSaleSchema>) {
  await requireCafe(s.gymId);
  const ids = [...new Set(input.items.map((i) => i.itemId))];
  const items = await db.cafeItem.findMany({ where: { gymId: s.gymId, id: { in: ids } } });
  if (items.length !== ids.length) throw new ApiError(400, "One of the items is no longer on the menu. Refresh and try again.");

  const qty = new Map<string, number>();
  for (const l of input.items) qty.set(l.itemId, (qty.get(l.itemId) ?? 0) + l.qty);

  const lines: SaleLine[] = items.map((it) => {
    const q = qty.get(it.id)!;
    if (!it.active) throw new ApiError(400, `${it.name} is switched off on the menu.`);
    if (it.stock != null && it.stock < q) throw new ApiError(400, it.stock === 0 ? `${it.name} is sold out.` : `Only ${it.stock} ${it.name} left.`);
    return { itemId: it.id, name: it.name, price: it.price, qty: q };
  });

  if (input.memberId) {
    const m = await db.member.findFirst({ where: { id: input.memberId, gymId: s.gymId }, select: { id: true } });
    if (!m) throw new ApiError(400, "Member not found.");
  }

  const total = lines.reduce((a, l) => a + l.price * l.qty, 0);
  return db.$transaction(async (tx) => {
    for (const l of lines) {
      const it = items.find((i) => i.id === l.itemId)!;
      if (it.stock != null) {
        // Only take stock if it's still there (two tills selling the last one)
        const r = await tx.cafeItem.updateMany({ where: { id: it.id, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
        if (!r.count) throw new ApiError(409, `${it.name} just sold out.`);
      }
    }
    return tx.cafeSale.create({
      data: {
        gymId: s.gymId,
        items: lines as unknown as Prisma.InputJsonValue,
        total,
        method: input.method,
        memberId: input.memberId ?? null,
        soldById: s.staffId,
      },
    });
  });
}

/** Undo a sale (owner/manager): the stock goes back. */
export async function voidSale(s: GymSession, id: string) {
  requireManager(s);
  await requireCafe(s.gymId);
  const sale = await db.cafeSale.findFirst({ where: { id, gymId: s.gymId } });
  if (!sale) throw new ApiError(404, "Sale not found.");
  await db.$transaction(async (tx) => {
    for (const l of sale.items as SaleLine[]) {
      await tx.cafeItem.updateMany({ where: { id: l.itemId, gymId: s.gymId, stock: { not: null } }, data: { stock: { increment: l.qty } } });
    }
    await tx.cafeSale.delete({ where: { id } });
  });
  return sale;
}

// ── Team ─────────────────────────────────────────────────────────────────────
export async function setCafeRole(s: GymSession, staffId: string, cafeRole: string | null) {
  requireManager(s);
  await requireCafe(s.gymId);
  const st = await db.staff.findFirst({ where: { id: staffId, gymId: s.gymId }, select: { id: true, name: true } });
  if (!st) throw new ApiError(404, "Staff member not found.");
  return db.staff.update({ where: { id: staffId }, data: { cafeRole }, select: { id: true, name: true, cafeRole: true } });
}
