import type { z } from "zod";
import { db } from "../db";
import type { branchSchema, settingsSchema } from "../validators";

export async function getSettings() {
  return db.gymSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
}

export async function updateSettings(input: z.infer<typeof settingsSchema>) {
  return db.gymSettings.upsert({ where: { id: "default" }, create: { id: "default", ...input }, update: input });
}

export async function listBranches() {
  return db.branch.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true, staff: true } } },
  });
}

export async function createBranch(input: z.infer<typeof branchSchema>) {
  return db.branch.create({ data: input });
}

export async function updateBranch(id: string, input: z.infer<typeof branchSchema>) {
  return db.branch.update({ where: { id }, data: input });
}
