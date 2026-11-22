import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { leadSchema } from "../validators";
import { nextNumber, ownedOr404 } from "./_shared";
import { randomToken } from "../crypto";

type LeadInput = z.infer<typeof leadSchema>;

export async function listLeads(gymId: string) {
  return db.lead.findMany({
    where: { gymId },
    orderBy: [{ updatedAt: "desc" }],
    include: { assignedTo: { select: { id: true, name: true } }, convertedMember: { select: { id: true, code: true } } },
  });
}

async function checkAssignee(gymId: string, staffId: string | null | undefined) {
  if (staffId) ownedOr404(await db.staff.findFirst({ where: { id: staffId, gymId }, select: { id: true } }), "Staff member");
}

export async function createLead(gymId: string, input: LeadInput) {
  await checkAssignee(gymId, input.assignedToId);
  return db.lead.create({ data: { ...input, gymId } });
}

export async function updateLead(gymId: string, id: string, input: Partial<LeadInput>) {
  ownedOr404(await db.lead.findFirst({ where: { id, gymId }, select: { id: true } }), "Lead");
  await checkAssignee(gymId, input.assignedToId);
  return db.lead.update({ where: { id }, data: input });
}

export async function deleteLead(gymId: string, id: string) {
  const l = ownedOr404(await db.lead.findFirst({ where: { id, gymId }, select: { id: true, name: true } }), "Lead");
  await db.lead.delete({ where: { id } });
  return l;
}

/** Turn a lead into a real member (keeps the link for reporting). */
export async function convertLead(gymId: string, id: string, branchId: string | null) {
  const lead = await db.lead.findFirst({ where: { id, gymId } });
  if (!lead) throw new ApiError(404, "Lead not found.");
  if (lead.convertedMemberId) throw new ApiError(400, "This lead is already a member.");
  const [firstName, ...rest] = lead.name.trim().split(/\s+/);
  return db.$transaction(async (tx) => {
    const n = await nextNumber(tx, gymId, "member", 1001);
    const member = await tx.member.create({
      data: {
        gymId,
        qrToken: randomToken(),
        code: `M-${n}`,
        firstName: firstName ?? lead.name,
        lastName: rest.join(" "),
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
