import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { leadSchema } from "../validators";
import { nextNumber } from "./_shared";

type LeadInput = z.infer<typeof leadSchema>;

export async function listLeads() {
  return db.lead.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: { assignedTo: { select: { id: true, name: true } }, convertedMember: { select: { id: true, code: true } } },
  });
}

export async function createLead(input: LeadInput) {
  return db.lead.create({ data: input });
}

export async function updateLead(id: string, input: Partial<LeadInput>) {
  return db.lead.update({ where: { id }, data: input });
}

export async function deleteLead(id: string) {
  await db.lead.delete({ where: { id } });
  return { ok: true };
}

/** Turn a lead into a real member (keeps the link for reporting). */
export async function convertLead(id: string, branchId: string | null) {
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) throw new ApiError(404, "Lead not found.");
  if (lead.convertedMemberId) throw new ApiError(400, "This lead is already a member.");
  const [firstName, ...rest] = lead.name.trim().split(/\s+/);
  return db.$transaction(async (tx) => {
    const n = await nextNumber(tx, "member", 1001);
    const member = await tx.member.create({
      data: {
        code: `M-${n}`,
        firstName: firstName ?? lead.name,
        lastName: rest.join(" ") || "-",
        phone: lead.phone,
        email: lead.email,
        branchId,
        notes: lead.notes,
      },
    });
    await tx.lead.update({ where: { id }, data: { status: "CONVERTED", convertedMemberId: member.id } });
    return member;
  });
}
