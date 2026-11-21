/**
 * The gym's own profile (name, logo, branding, invoice details …) and branches.
 * WhatsApp settings live in whatsapp.service.ts.
 */
import type { z } from "zod";
import { db } from "../db";
import type { branchSchema, settingsSchema } from "../validators";
import { ownedOr404 } from "./_shared";

const profileSelect = {
  id: true,
  name: true,
  slug: true,
  legalName: true,
  crNumber: true,
  phone: true,
  email: true,
  address: true,
  website: true,
  instagram: true,
  openingHours: true,
  logo: true,
  brandColor: true,
  currency: true,
  timezone: true,
  invoicePrefix: true,
  invoiceFooter: true,
  expiryWarnDays: true,
  plan: true,
  status: true,
  trialEndsAt: true,
} as const;

export async function getSettings(gymId: string) {
  return ownedOr404(await db.gym.findUnique({ where: { id: gymId }, select: profileSelect }), "Gym");
}

export async function updateSettings(gymId: string, input: z.infer<typeof settingsSchema>) {
  const { logo, ...data } = input;
  return db.gym.update({
    where: { id: gymId },
    // logo: undefined = keep, null = remove, string = replace
    data: { ...data, ...(logo !== undefined ? { logo } : {}) },
    select: profileSelect,
  });
}

export async function listBranches(gymId: string) {
  return db.branch.findMany({
    where: { gymId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true, staff: true } } },
  });
}

export async function createBranch(gymId: string, input: z.infer<typeof branchSchema>) {
  return db.branch.create({ data: { ...input, gymId } });
}

export async function updateBranch(gymId: string, id: string, input: z.infer<typeof branchSchema>) {
  ownedOr404(await db.branch.findFirst({ where: { id, gymId }, select: { id: true } }), "Branch");
  return db.branch.update({ where: { id }, data: input });
}
