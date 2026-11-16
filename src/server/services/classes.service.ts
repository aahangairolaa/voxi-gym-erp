import type { z } from "zod";
import { addDays, startOfDay } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../http";
import type { classSchema } from "../validators";
import { fullName } from "./_shared";

type ClassInput = z.infer<typeof classSchema>;

export async function listClasses(opts: { from?: Date | null; days?: number }) {
  const from = opts.from ?? startOfDay();
  const to = addDays(from, opts.days ?? 7);
  const classes = await db.gymClass.findMany({
    where: { startsAt: { gte: from, lt: to } },
    orderBy: { startsAt: "asc" },
    include: {
      trainer: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      bookings: {
        where: { status: { not: "CANCELLED" } },
        include: { member: { select: { id: true, code: true, firstName: true, lastName: true } } },
      },
    },
  });
  return classes.map((c) => ({
    ...c,
    booked: c.bookings.length,
    bookings: c.bookings.map((b) => ({ id: b.id, status: b.status, member: { id: b.member.id, code: b.member.code, name: fullName(b.member) } })),
  }));
}

export async function createClass(input: ClassInput) {
  return db.gymClass.create({ data: input });
}

export async function updateClass(id: string, input: ClassInput) {
  return db.gymClass.update({ where: { id }, data: input });
}

export async function deleteClass(id: string) {
  await db.gymClass.delete({ where: { id } });
  return { ok: true };
}

export async function bookClass(classId: string, memberId: string) {
  const c = await db.gymClass.findUnique({
    where: { id: classId },
    include: { _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
  });
  if (!c) throw new ApiError(404, "Class not found.");
  if (c._count.bookings >= c.capacity) throw new ApiError(400, "This class is full.");
  // If they cancelled before, re-activate the same booking
  return db.classBooking.upsert({
    where: { classId_memberId: { classId, memberId } },
    create: { classId, memberId },
    update: { status: "BOOKED" },
  });
}

export async function updateBooking(bookingId: string, status: "BOOKED" | "ATTENDED" | "CANCELLED" | "NO_SHOW") {
  return db.classBooking.update({ where: { id: bookingId }, data: { status } });
}
