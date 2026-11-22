/**
 * Bring a gym's existing members into VOXI from a spreadsheet (CSV).
 * The browser reads the file and sends rows of text; here every row is cleaned,
 * checked, de-duplicated (by phone) and created in a few fast bulk queries.
 * Optional plan + end date columns create the member's current membership too
 * (marked as already paid, so no balance is owed).
 */
import { db } from "../db";
import { ApiError } from "../http";
import { randomToken } from "../crypto";
import { addDays, endOfDay, fromDateInput, startOfDay } from "@/lib/dates";
import type { GymSession } from "../auth";

export type ImportRow = Partial<Record<(typeof IMPORT_FIELDS)[number], string>>;
export const IMPORT_FIELDS = ["firstName", "lastName", "fullName", "phone", "email", "gender", "dateOfBirth", "qid", "nationality", "emergencyName", "emergencyPhone", "notes", "plan", "startDate", "endDate"] as const;

const digits = (s: string) => s.replace(/\D/g, "");
const phoneKey = (s: string) => digits(s).slice(-8);

function parseDate(v?: string): Date | null {
  if (!v?.trim()) return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return fromDateInput(`${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); // Qatar style: day/month/year
  if (m) {
    const y = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
    const d = fromDateInput(`${y}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseGender(v?: string): "MALE" | "FEMALE" | null {
  const s = (v ?? "").trim().toLowerCase();
  if (["m", "male", "man", "ذكر", "رجل"].includes(s)) return "MALE";
  if (["f", "female", "woman", "أنثى", "انثى", "امرأة"].includes(s)) return "FEMALE";
  return null;
}

const clip = (v: string | undefined, max: number) => (v?.trim() ? v.trim().slice(0, max) : null);

export async function importMembers(session: GymSession, rows: ImportRow[], opts: { branchId: string | null; dryRun: boolean }) {
  if (!rows.length) throw new ApiError(400, "The file has no rows.");
  if (rows.length > 3000) throw new ApiError(400, "Import up to 3,000 members at a time.");
  const gymId = session.gymId;
  if (opts.branchId && !(await db.branch.findFirst({ where: { id: opts.branchId, gymId }, select: { id: true } }))) {
    throw new ApiError(400, "Unknown branch.");
  }

  const [existing, plans] = await Promise.all([
    db.member.findMany({ where: { gymId }, select: { phone: true } }),
    db.plan.findMany({ where: { gymId }, select: { id: true, name: true, price: true, durationDays: true } }),
  ]);
  const seen = new Set(existing.map((m) => phoneKey(m.phone)));
  const planByName = new Map(plans.map((p) => [p.name.trim().toLowerCase(), p]));

  const ok: {
    member: { firstName: string; lastName: string; phone: string; email: string | null; gender: "MALE" | "FEMALE" | null; dateOfBirth: Date | null; qid: string | null; nationality: string | null; emergencyName: string | null; emergencyPhone: string | null; notes: string | null };
    plan: (typeof plans)[number] | null;
    start: Date | null;
    end: Date | null;
  }[] = [];
  const skipped: { row: number; name: string; reason: string }[] = [];

  rows.forEach((r, i) => {
    const rowNo = i + 2; // +1 header, +1 for 1-based
    let first = r.firstName?.trim() ?? "";
    let last = r.lastName?.trim() ?? "";
    if (!first && r.fullName?.trim()) {
      const parts = r.fullName.trim().split(/\s+/);
      first = parts.shift() ?? "";
      last = parts.join(" ");
    }
    const name = `${first} ${last}`.trim() || `(row ${rowNo})`;
    const phone = (r.phone ?? "").trim();
    if (!first) return skipped.push({ row: rowNo, name, reason: "No name" });
    if (digits(phone).length < 7) return skipped.push({ row: rowNo, name, reason: "Missing or short phone number" });
    const key = phoneKey(phone);
    if (seen.has(key)) return skipped.push({ row: rowNo, name, reason: "Phone number already in VOXI (or twice in the file)" });
    const email = r.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return skipped.push({ row: rowNo, name, reason: `Invalid email “${email}”` });

    let plan: (typeof plans)[number] | null = null;
    let start: Date | null = null;
    let end: Date | null = null;
    if (r.plan?.trim()) {
      plan = planByName.get(r.plan.trim().toLowerCase()) ?? null;
      if (!plan) return skipped.push({ row: rowNo, name, reason: `No plan called “${r.plan.trim()}”. Create it first or fix the name` });
      end = parseDate(r.endDate);
      if (!end) return skipped.push({ row: rowNo, name, reason: "Plan given but the end date is missing or unreadable" });
      start = parseDate(r.startDate) ?? addDays(end, -(plan.durationDays - 1));
      end = endOfDay(end);
      start = startOfDay(start);
    }
    seen.add(key);
    ok.push({
      member: {
        firstName: first.slice(0, 60),
        lastName: (last || "-").slice(0, 60),
        phone: phone.slice(0, 20),
        email,
        gender: parseGender(r.gender),
        dateOfBirth: parseDate(r.dateOfBirth),
        qid: clip(r.qid, 20),
        nationality: clip(r.nationality, 60),
        emergencyName: clip(r.emergencyName, 80),
        emergencyPhone: clip(r.emergencyPhone, 20),
        notes: clip(r.notes, 1000),
      },
      plan,
      start,
      end,
    });
  });

  const summary = { total: rows.length, ready: ok.length, withMembership: ok.filter((o) => o.plan).length, skipped };
  if (opts.dryRun || ok.length === 0) return { ...summary, created: 0 };

  await db.$transaction(
    async (tx) => {
      // Reserve a block of member numbers in one step
      const counter = await tx.counter.upsert({
        where: { gymId_key: { gymId, key: "member" } },
        create: { gymId, key: "member", value: 1000 + ok.length },
        update: { value: { increment: ok.length } },
      });
      const first = counter.value - ok.length + 1;
      const codes = ok.map((_, i) => `M-${first + i}`);
      await tx.member.createMany({
        data: ok.map((o, i) => ({ ...o.member, gymId, code: codes[i]!, qrToken: randomToken(), branchId: opts.branchId ?? session.branchId, notes: o.member.notes })),
      });
      const created = await tx.member.findMany({ where: { gymId, code: { in: codes } }, select: { id: true, code: true } });
      const idByCode = new Map(created.map((c) => [c.code, c.id]));
      const now = new Date();
      const memberships = ok
        .map((o, i) => ({ o, memberId: idByCode.get(codes[i]!) }))
        .filter((x) => x.o.plan && x.memberId)
        .map(({ o, memberId }) => ({
          gymId,
          memberId: memberId!,
          planId: o.plan!.id,
          startDate: o.start!,
          endDate: o.end!,
          status: o.end! < now ? ("EXPIRED" as const) : ("ACTIVE" as const),
          price: o.plan!.price,
          discount: o.plan!.price, // paid before VOXI → no balance owed
          notes: "Imported, paid before VOXI",
        }));
      if (memberships.length) await tx.membership.createMany({ data: memberships });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
  return { ...summary, created: ok.length };
}
