/**
 * Housekeeping: recurring cleaning tasks, today's checklist, and problem reports.
 * - Managers create tasks (daily or on one weekday), optionally for a branch / person.
 * - Housekeeping staff tick tasks off on their phone and report issues
 *   ("Treadmill 3 belt torn", "Ladies shower drain blocked").
 * - Managers see progress and resolve issues.
 */
import type { z } from "zod";
import { addDays, qatarParts, startOfDay } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import type { housekeepingLogSchema, housekeepingTaskSchema } from "../validators";
import { ownedOr404 } from "./_shared";

type TaskInput = z.infer<typeof housekeepingTaskSchema>;

const SHIFT_ORDER = { MORNING: 0, AFTERNOON: 1, EVENING: 2, ANYTIME: 3 } as const;

async function checkRefs(gymId: string, input: TaskInput) {
  if (input.branchId) ownedOr404(await db.branch.findFirst({ where: { id: input.branchId, gymId }, select: { id: true } }), "Branch");
  if (input.assignedToId) ownedOr404(await db.staff.findFirst({ where: { id: input.assignedToId, gymId }, select: { id: true } }), "Staff member");
}

export async function listTasks(gymId: string) {
  return db.housekeepingTask.findMany({
    where: { gymId },
    orderBy: [{ isActive: "desc" }, { area: "asc" }, { title: "asc" }],
    include: { assignedTo: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
  });
}

export async function createTask(gymId: string, input: TaskInput) {
  await checkRefs(gymId, input);
  return db.housekeepingTask.create({ data: { ...input, gymId, weekday: input.frequency === "WEEKLY" ? input.weekday ?? 0 : null } });
}

export async function updateTask(gymId: string, id: string, input: TaskInput) {
  ownedOr404(await db.housekeepingTask.findFirst({ where: { id, gymId }, select: { id: true } }), "Task");
  await checkRefs(gymId, input);
  return db.housekeepingTask.update({
    where: { id },
    data: { ...input, weekday: input.frequency === "WEEKLY" ? input.weekday ?? 0 : null },
  });
}

export async function deleteTask(gymId: string, id: string) {
  const t = ownedOr404(await db.housekeepingTask.findFirst({ where: { id, gymId }, select: { id: true, title: true } }), "Task");
  await db.housekeepingTask.delete({ where: { id } });
  return t;
}

/** Today's checklist: every task due today with its status, plus open issues. */
export async function getToday(session: GymSession, opts: { branchId?: string | null; mine?: boolean }) {
  const gymId = session.gymId;
  const day = startOfDay();
  const weekday = qatarParts(new Date()).weekday;

  const [tasks, logs, openIssues, week] = await Promise.all([
    db.housekeepingTask.findMany({
      where: {
        gymId,
        isActive: true,
        AND: [
          { OR: [{ frequency: "DAILY" }, { frequency: "WEEKLY", weekday }] },
          ...(opts.branchId ? [{ OR: [{ branchId: opts.branchId }, { branchId: null }] }] : []),
          ...(opts.mine ? [{ OR: [{ assignedToId: session.staffId }, { assignedToId: null }] }] : []),
        ],
      },
      include: { assignedTo: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
    }),
    db.housekeepingLog.findMany({
      where: { gymId, day, taskId: { not: null } },
      orderBy: { createdAt: "desc" },
      include: { completedBy: { select: { id: true, name: true } } },
    }),
    db.housekeepingLog.findMany({
      where: { gymId, status: "ISSUE", resolvedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { completedBy: { select: { name: true } }, task: { select: { title: true, area: true } } },
    }),
    // last 7 days: tasks done per day (for the manager's chart)
    db.housekeepingLog.groupBy({ by: ["day"], where: { gymId, status: "DONE", day: { gte: addDays(day, -6) } }, _count: { _all: true } }),
  ]);

  const latestByTask = new Map<string, (typeof logs)[number]>();
  for (const l of logs) if (l.taskId && !latestByTask.has(l.taskId)) latestByTask.set(l.taskId, l);

  const items = tasks
    .map((t) => {
      const log = latestByTask.get(t.id) ?? null;
      return {
        id: t.id,
        area: t.area,
        title: t.title,
        shift: t.shift,
        frequency: t.frequency,
        branch: t.branch,
        assignedTo: t.assignedTo,
        status: (log?.status ?? "PENDING") as "PENDING" | "DONE" | "ISSUE",
        logId: log?.id ?? null,
        note: log?.note ?? null,
        doneBy: log?.completedBy?.name ?? null,
        doneAt: log?.createdAt ?? null,
      };
    })
    .sort((a, b) => SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift] || a.area.localeCompare(b.area) || a.title.localeCompare(b.title));

  const done = items.filter((i) => i.status === "DONE").length;
  return {
    date: day,
    items,
    progress: { total: items.length, done, issues: items.filter((i) => i.status === "ISSUE").length, pending: items.length - done },
    openIssues: openIssues.map((i) => ({
      id: i.id,
      area: i.area ?? i.task?.area ?? "General",
      title: i.task?.title ?? null,
      note: i.note,
      reportedBy: i.completedBy?.name ?? null,
      reportedAt: i.createdAt,
    })),
    week: Array.from({ length: 7 }, (_, k) => {
      const d = addDays(day, k - 6);
      return { date: d, done: week.find((w) => w.day.getTime() === d.getTime())?._count._all ?? 0 };
    }),
  };
}

/** Tick a task done, report an issue on it, or report a general issue. */
export async function logTask(session: GymSession, input: z.infer<typeof housekeepingLogSchema>) {
  const gymId = session.gymId;
  const day = startOfDay();
  if (input.taskId) {
    const task = ownedOr404(await db.housekeepingTask.findFirst({ where: { id: input.taskId, gymId }, select: { id: true, area: true } }), "Task");
    if (input.status === "DONE") {
      const already = await db.housekeepingLog.findFirst({ where: { gymId, taskId: task.id, day, status: "DONE" } });
      if (already) return already;
    }
    return db.housekeepingLog.create({
      data: { gymId, taskId: task.id, day, status: input.status, note: input.note, area: task.area, completedById: session.staffId },
    });
  }
  if (input.status !== "ISSUE" || !input.note) throw new ApiError(400, "Describe the problem you want to report.");
  return db.housekeepingLog.create({
    data: { gymId, day, status: "ISSUE", note: input.note, area: input.area ?? "General", completedById: session.staffId },
  });
}

/** Undo a tick (your own today, or any as a manager). */
export async function undoLog(session: GymSession, id: string) {
  const log = ownedOr404(await db.housekeepingLog.findFirst({ where: { id, gymId: session.gymId } }), "Entry");
  const manager = session.role === "OWNER" || session.role === "MANAGER";
  if (!manager && (log.completedById !== session.staffId || log.day.getTime() !== startOfDay().getTime())) {
    throw new ApiError(403, "You can only undo your own entries from today.");
  }
  await db.housekeepingLog.delete({ where: { id } });
  return { ok: true };
}

export async function resolveIssue(session: GymSession, id: string) {
  const log = ownedOr404(await db.housekeepingLog.findFirst({ where: { id, gymId: session.gymId, status: "ISSUE" } }), "Issue");
  return db.housekeepingLog.update({ where: { id: log.id }, data: { resolvedAt: new Date() } });
}
