/**
 * Promo codes VOXI gives to gyms. Admins create them in /admin; gyms enter them on Billing.
 * A code takes money off the first invoice only.
 */
import type { z } from "zod";
import { promoLabel, type Promo, type PromoKind, type PromoScope } from "@/lib/pricing";
import { db } from "../db";
import { ApiError } from "../http";
import type { promoSchema } from "../validators";

type Row = { code: string; kind: string; value: number; appliesTo: string; minMonths: number | null };

export function toPromo(r: Row): Promo {
  const p = { code: r.code, kind: r.kind as PromoKind, value: r.value, appliesTo: r.appliesTo as PromoScope, minMonths: r.minMonths };
  return { ...p, label: promoLabel(p) };
}

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

/** Look up a code a gym typed. Throws a friendly 400 when it can't be used. */
export async function findUsablePromo(raw: string, months?: number): Promise<Promo> {
  const code = normalizeCode(raw);
  if (!code) throw new ApiError(400, "Enter a promo code.");
  const p = await db.promoCode.findUnique({ where: { code } });
  if (!p || !p.active) throw new ApiError(400, "That promo code isn't valid.");
  if (p.expiresAt && p.expiresAt.getTime() < Date.now()) throw new ApiError(400, "That promo code has expired.");
  if (p.maxUses != null && p.uses >= p.maxUses) throw new ApiError(400, "That promo code has been fully used.");
  if (months && p.minMonths && months < p.minMonths) {
    throw new ApiError(400, `That code is only for the ${p.minMonths === 12 ? "Annual" : `${p.minMonths}-month or longer`} plan.`);
  }
  return toPromo(p);
}

/** Count one use, when VOXI activates a plan that used the code. */
export async function countPromoUse(code: string | null | undefined) {
  if (!code) return;
  await db.promoCode.updateMany({ where: { code: normalizeCode(code) }, data: { uses: { increment: 1 } } });
}

// ── Admin ────────────────────────────────────────────────────────────────────
export async function listPromos() {
  const rows = await db.promoCode.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  return rows.map((r) => ({ ...r, label: promoLabel(toPromo(r)) }));
}

export async function createPromo(input: z.infer<typeof promoSchema>) {
  const code = normalizeCode(input.code);
  if (await db.promoCode.findUnique({ where: { code } })) throw new ApiError(409, `The code ${code} already exists.`);
  return db.promoCode.create({ data: { ...input, code } });
}

export async function setPromoActive(id: string, active: boolean) {
  return db.promoCode.update({ where: { id }, data: { active } });
}
