import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { leadImportSchema, leadSchema } from "../validators";
import { parseSource } from "@/lib/sources";
import { emailError, normalizePhone, phoneError } from "@/lib/validate";
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
        // Keep where they came from and who worked the lead, for the Sales page
        source: lead.source,
        soldById: lead.assignedToId,
      },
    });
    await tx.lead.update({ where: { id }, data: { status: "CONVERTED", convertedMemberId: member.id } });
    return member;
  });
}

/** Spreadsheets hold local numbers: "5512 3456" means +974, "00974..." means +974. */
function importPhone(raw: string) {
  const v = raw.trim().replace(/^00/, "+");
  return v.startsWith("+") ? v : `+974 ${v}`;
}

/**
 * Import leads from a spreadsheet. With commit=false it only checks the rows and
 * reports what would be imported or skipped; with commit=true it saves them.
 * Leads whose phone is already a lead are skipped, so importing twice is safe.
 */
export async function importLeads(gymId: string, input: z.infer<typeof leadImportSchema>) {
  const existing = new Set((await db.lead.findMany({ where: { gymId }, select: { phone: true } })).map((l) => l.phone));
  const ready: { name: string; phone: string; email: string | null; source: NonNullable<ReturnType<typeof parseSource>>; interest: string | null; notes: string | null }[] = [];
  const skipped: { row: number; name: string; reason: string }[] = [];
  const seen = new Set<string>();

  input.rows.forEach((r, i) => {
    const row = i + 2; // row 1 is the header
    const name = (r.name ?? "").trim().replace(/\s+/g, " ");
    const rawPhone = (r.phone ?? "").trim();
    if (!name) return skipped.push({ row, name: "", reason: "No name" });
    if (!rawPhone) return skipped.push({ row, name, reason: "No phone number" });
    const phoneProblem = phoneError(importPhone(rawPhone), true);
    if (phoneProblem) return skipped.push({ row, name, reason: `Phone “${rawPhone}”: ${phoneProblem.toLowerCase()}` });
    const phone = normalizePhone(importPhone(rawPhone));
    if (existing.has(phone) || seen.has(phone)) return skipped.push({ row, name, reason: "Already a lead with this phone" });
    const email = (r.email ?? "").trim().toLowerCase() || null;
    if (email && emailError(email, false)) return skipped.push({ row, name, reason: `Email “${email}” isn't valid` });
    seen.add(phone);
    ready.push({
      name: name.slice(0, 100),
      phone,
      email,
      source: parseSource(r.source) ?? "OTHER",
      interest: (r.interest ?? "").trim().slice(0, 200) || null,
      notes: (r.notes ?? "").trim().slice(0, 1000) || null,
    });
  });

  if (input.commit && ready.length) {
    await db.lead.createMany({ data: ready.map((l) => ({ ...l, gymId })) });
  }
  return { ready: ready.length, skipped, imported: input.commit ? ready.length : 0, preview: ready.slice(0, 5) };
}
