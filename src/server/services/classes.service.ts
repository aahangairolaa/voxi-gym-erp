import type { z } from "zod";
import { addDays, startOfDay } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../http";
import type { classSchema } from "../validators";
import { fullName, ownedOr404 } from "./_shared";

type ClassInput = z.infer<typeof classSchema>;

export async function listClasses(gymId: string, opts: { from?: Date | null; days?: number }) {
  const from = opts.from ?? startOfDay();
  const to = addDays(from, opts.days ?? 7);
  const classes = await db.gymClass.findMany({
    where: { gymId, startsAt: { gte: from, lt: to } },
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

async function checkRefs(gymId: string, input: ClassInput) {
  if (input.trainerId) ownedOr404(await db.staff.findFirst({ where: { id: input.trainerId, gymId }, select: { id: true } }), "Trainer");
  if (input.branchId) ownedOr404(await db.branch.findFirst({ where: { id: input.branchId, gymId }, select: { id: true } }), "Branch");
}

export async function createClass(gymId: string, input: ClassInput) {
  await checkRefs(gymId, input);
  return db.gymClass.create({ data: { ...input, gymId } });
}

export async function updateClass(gymId: string, id: string, input: ClassInput) {
  ownedOr404(await db.gymClass.findFirst({ where: { id, gymId }, select: { id: true } }), "Class");
  await checkRefs(gymId, input);
  return db.gymClass.update({ where: { id }, data: input });
}

export async function deleteClass(gymId: string, id: string) {
  const c = ownedOr404(await db.gymClass.findFirst({ where: { id, gymId }, select: { id: true, name: true } }), "Class");
  await db.gymClass.delete({ where: { id } });
  return c;
}

export async function bookClass(gymId: string, classId: string, memberId: string) {
  ownedOr404(await db.member.findFirst({ where: { id: memberId, gymId }, select: { id: true } }), "Member");
  const c = await db.gymClass.findFirst({
    where: { id: classId, gymId },
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

export async function updateBooking(gymId: string, bookingId: string, status: "BOOKED" | "ATTENDED" | "CANCELLED" | "NO_SHOW") {
  ownedOr404(await db.classBooking.findFirst({ where: { id: bookingId, gymClass: { gymId } }, select: { id: true } }), "Booking");
  return db.classBooking.update({ where: { id: bookingId }, data: { status } });
}
