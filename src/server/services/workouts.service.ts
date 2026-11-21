import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { exerciseSchema, workoutLogSchema, workoutPlanSchema } from "../validators";
import { fullName, ownedOr404 } from "./_shared";

type PlanInput = z.infer<typeof workoutPlanSchema>;

const planInclude = {
  trainer: { select: { id: true, name: true } },
  member: { select: { id: true, code: true, firstName: true, lastName: true } },
  items: { orderBy: [{ day: "asc" as const }, { order: "asc" as const }], include: { exercise: true } },
  _count: { select: { logs: true } },
};

function shape<T extends { member: { firstName: string; lastName: string; id: string; code: string } | null }>(p: T) {
  return { ...p, member: p.member ? { id: p.member.id, code: p.member.code, name: fullName(p.member) } : null };
}

export async function listExercises(gymId: string) {
  return db.exercise.findMany({ where: { gymId }, orderBy: [{ muscleGroup: "asc" }, { name: "asc" }] });
}

export async function createExercise(gymId: string, input: z.infer<typeof exerciseSchema>) {
  return db.exercise.create({ data: { ...input, gymId } });
}

export async function listWorkoutPlans(gymId: string, opts: { memberId?: string | null }) {
  const plans = await db.workoutPlan.findMany({
    where: { gymId, ...(opts.memberId ? { memberId: opts.memberId } : {}) },
    orderBy: { createdAt: "desc" },
    include: planInclude,
  });
  return plans.map(shape);
}

export async function getWorkoutPlan(gymId: string, id: string) {
  const p = await db.workoutPlan.findFirst({ where: { id, gymId }, include: planInclude });
  if (!p) throw new ApiError(404, "Workout plan not found.");
  return shape(p);
}

/** Trainer, member and every exercise must belong to this gym. */
async function checkRefs(gymId: string, input: PlanInput) {
  if (input.trainerId) ownedOr404(await db.staff.findFirst({ where: { id: input.trainerId, gymId }, select: { id: true } }), "Trainer");
  if (input.memberId) ownedOr404(await db.member.findFirst({ where: { id: input.memberId, gymId }, select: { id: true } }), "Member");
  const ids = [...new Set(input.items.map((i) => i.exerciseId))];
  if (ids.length) {
    const found = await db.exercise.count({ where: { gymId, id: { in: ids } } });
    if (found !== ids.length) throw new ApiError(400, "One of the exercises doesn't exist in your library.");
  }
}

export async function createWorkoutPlan(gymId: string, input: PlanInput) {
  await checkRefs(gymId, input);
  const { items, ...data } = input;
  const p = await db.workoutPlan.create({
    data: { ...data, gymId, items: { create: items.map((it, i) => ({ ...it, order: i })) } },
    include: planInclude,
  });
  return shape(p);
}

/** Replaces the plan's details and its full list of exercises. */
export async function updateWorkoutPlan(gymId: string, id: string, input: PlanInput) {
  ownedOr404(await db.workoutPlan.findFirst({ where: { id, gymId }, select: { id: true } }), "Workout plan");
  await checkRefs(gymId, input);
  const { items, ...data } = input;
  const p = await db.$transaction(async (tx) => {
    await tx.workoutItem.deleteMany({ where: { workoutPlanId: id } });
    return tx.workoutPlan.update({
      where: { id },
      data: { ...data, items: { create: items.map((it, i) => ({ ...it, order: i })) } },
      include: planInclude,
    });
  });
  return shape(p);
}

export async function deleteWorkoutPlan(gymId: string, id: string) {
  ownedOr404(await db.workoutPlan.findFirst({ where: { id, gymId }, select: { id: true } }), "Workout plan");
  await db.workoutPlan.delete({ where: { id } });
  return { ok: true };
}

/** Copy a template to a member so the trainer can personalise it. */
export async function assignWorkoutPlan(gymId: string, id: string, memberId: string) {
  const tpl = ownedOr404(await db.workoutPlan.findFirst({ where: { id, gymId }, include: { items: true } }), "Workout plan");
  ownedOr404(await db.member.findFirst({ where: { id: memberId, gymId }, select: { id: true } }), "Member");
  const p = await db.workoutPlan.create({
    data: {
      gymId,
      name: tpl.name,
      goal: tpl.goal,
      level: tpl.level,
      description: tpl.description,
      daysPerWeek: tpl.daysPerWeek,
      trainerId: tpl.trainerId,
      memberId,
      items: {
        create: tpl.items.map((it) => ({
          exerciseId: it.exerciseId,
          day: it.day,
          sets: it.sets,
          reps: it.reps,
          restSeconds: it.restSeconds,
          order: it.order,
        })),
      },
    },
    include: planInclude,
  });
  return shape(p);
}

export async function logWorkout(gymId: string, input: z.infer<typeof workoutLogSchema>) {
  ownedOr404(await db.member.findFirst({ where: { id: input.memberId, gymId }, select: { id: true } }), "Member");
  if (input.workoutPlanId) ownedOr404(await db.workoutPlan.findFirst({ where: { id: input.workoutPlanId, gymId }, select: { id: true } }), "Workout plan");
  return db.workoutLog.create({ data: { ...input, gymId } });
}

export async function listWorkoutLogs(gymId: string, limit = 50) {
  const logs = await db.workoutLog.findMany({
    where: { gymId },
    orderBy: { loggedAt: "desc" },
    take: limit,
    include: {
      member: { select: { id: true, code: true, firstName: true, lastName: true } },
      workoutPlan: { select: { name: true } },
    },
  });
  return logs.map((l) => ({
    id: l.id,
    member: { id: l.member.id, code: l.member.code, name: fullName(l.member) },
    plan: l.workoutPlan?.name ?? null,
    durationMin: l.durationMin,
    calories: l.calories,
    notes: l.notes,
    loggedAt: l.loggedAt,
  }));
}
