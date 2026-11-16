import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { exerciseSchema, workoutLogSchema, workoutPlanSchema } from "../validators";
import { fullName } from "./_shared";

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

export async function listExercises() {
  return db.exercise.findMany({ orderBy: [{ muscleGroup: "asc" }, { name: "asc" }] });
}

export async function createExercise(input: z.infer<typeof exerciseSchema>) {
  return db.exercise.create({ data: input });
}

export async function listWorkoutPlans(opts: { memberId?: string | null }) {
  const plans = await db.workoutPlan.findMany({
    where: opts.memberId ? { memberId: opts.memberId } : {},
    orderBy: { createdAt: "desc" },
    include: planInclude,
  });
  return plans.map(shape);
}

export async function getWorkoutPlan(id: string) {
  const p = await db.workoutPlan.findUnique({ where: { id }, include: planInclude });
  if (!p) throw new ApiError(404, "Workout plan not found.");
  return shape(p);
}

export async function createWorkoutPlan(input: PlanInput) {
  const { items, ...data } = input;
  const p = await db.workoutPlan.create({
    data: { ...data, items: { create: items.map((it, i) => ({ ...it, order: i })) } },
    include: planInclude,
  });
  return shape(p);
}

/** Replaces the plan's details and its full list of exercises. */
export async function updateWorkoutPlan(id: string, input: PlanInput) {
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

export async function deleteWorkoutPlan(id: string) {
  await db.workoutPlan.delete({ where: { id } });
  return { ok: true };
}

/** Copy a template to a member so the trainer can personalise it. */
export async function assignWorkoutPlan(id: string, memberId: string) {
  const tpl = await db.workoutPlan.findUnique({ where: { id }, include: { items: true } });
  if (!tpl) throw new ApiError(404, "Workout plan not found.");
  const p = await db.workoutPlan.create({
    data: {
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

export async function logWorkout(input: z.infer<typeof workoutLogSchema>) {
  return db.workoutLog.create({ data: input });
}

export async function listWorkoutLogs(limit = 50) {
  const logs = await db.workoutLog.findMany({
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
