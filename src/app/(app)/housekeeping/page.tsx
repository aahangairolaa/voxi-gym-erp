"use client";
import { useEffect, useMemo, useState } from "react";
import {
  LuCircleAlert, LuCircleCheck, LuCircle, LuPencil, LuPlus, LuSparkles, LuTrash2, LuTriangleAlert, LuUser,
} from "react-icons/lu";
import { BarChart } from "@/components/charts";
import { useUser } from "@/components/layout/session-context";
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, Textarea, Toggle,
  useConfirm, useToast,
} from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useBranches } from "@/hooks/use-lookups";
import { api, withQuery } from "@/lib/api-client";
import { formatTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HousekeepingTask, HousekeepingToday, Shift } from "@/types/api";

const SHIFTS: { value: Shift; label: string; emoji: string }[] = [
  { value: "MORNING", label: "Morning", emoji: "🌅" },
  { value: "AFTERNOON", label: "Afternoon", emoji: "☀️" },
  { value: "EVENING", label: "Evening", emoji: "🌙" },
  { value: "ANYTIME", label: "Any time", emoji: "🧹" },
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const AREAS = ["Gym floor", "Cardio zone", "Free weights", "Studio", "Men's changing room", "Ladies' changing room", "Showers", "Toilets", "Reception", "Pool", "Sauna & steam", "Entrance", "General"];

type Tab = "today" | "issues" | "tasks";

/** Housekeeping: today's cleaning checklist (phone-friendly), problem reports, and the task list. */
export default function HousekeepingPage() {
  const user = useUser();
  const manager = user.role === "OWNER" || user.role === "MANAGER";
  const [tab, setTab] = useState<Tab>("today");
  const [mine, setMine] = useState(!manager);
  const today = useApi<HousekeepingToday>(withQuery("/api/housekeeping/today", { mine: mine ? 1 : null }), { refreshMs: 30_000 });
  const [report, setReport] = useState<{ taskId?: string; area?: string; title?: string } | null>(null);

  if (today.error) return <ErrorState message={today.error} onRetry={today.reload} />;
  const d = today.data;
  const pct = d && d.progress.total ? Math.round((d.progress.done / d.progress.total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Housekeeping"
        subtitle={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Qatar" })}
        actions={
          <Button variant="secondary" onClick={() => setReport({})}>
            <LuTriangleAlert className="h-4 w-4 text-amber-500" /> Report a problem
          </Button>
        }
      />

      {/* Progress */}
      <Card className="relative mb-5 overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6 p-5 sm:p-6">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-surface-2" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="url(#hk)"
                strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
                className="transition-all duration-700"
              />
              <defs>
                <linearGradient id="hk" x1="0" x2="1">
                  <stop offset="0" stopColor="#9b84ff" />
                  <stop offset="1" stopColor="#6a44f2" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 grid place-items-center font-display text-xl font-semibold">{pct}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-ink">
              {d ? (d.progress.pending === 0 && d.progress.total > 0 ? "All done for today ✨" : `${d.progress.done} of ${d.progress.total} tasks done`) : "Loading…"}
            </p>
            <p className="text-sm text-muted">
              {d ? `${d.progress.pending} left · ${d.openIssues.length} open problem${d.openIssues.length === 1 ? "" : "s"}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Toggle checked={mine} onChange={setMine} label="Only my tasks" />
            </div>
          </div>
          {manager && d && (
            <div className="w-full sm:w-72">
              <p className="mb-1 text-xs font-semibold text-muted">Tasks done — last 7 days</p>
              <BarChart
                height={110}
                labels={d.week.map((w) => new Date(w.date).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Qatar" }))}
                series={[{ name: "Done", color: "#7c5cff", values: d.week.map((w) => w.done) }]}
              />
            </div>
          )}
        </div>
      </Card>

      {manager && (
        <div className="mb-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "today", label: "Today’s checklist" },
              { value: "issues", label: `Problems${d?.openIssues.length ? ` · ${d.openIssues.length}` : ""}` },
              { value: "tasks", label: "Manage tasks" },
            ]}
          />
        </div>
      )}

      {tab === "today" && <TodayList data={d} reload={today.reload} onReport={setReport} />}
      {tab === "issues" && <IssuesList data={d} reload={today.reload} />}
      {tab === "tasks" && manager && <TaskManager onChanged={today.reload} />}

      {!manager && d && d.openIssues.length > 0 && (
        <div className="mt-5">
          <IssuesList data={d} reload={today.reload} readOnly />
        </div>
      )}

      <ReportModal state={report} onClose={() => setReport(null)} onDone={today.reload} />
    </>
  );
}

function TodayList({
  data,
  reload,
  onReport,
}: {
  data: HousekeepingToday | undefined;
  reload: () => void;
  onReport: (r: { taskId?: string; area?: string; title?: string }) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const tick = async (item: HousekeepingToday["items"][number]) => {
    setBusy(item.id);
    try {
      if (item.status === "DONE" && item.logId) await api.del(`/api/housekeeping/logs/${item.logId}`);
      else await api.post("/api/housekeeping/logs", { taskId: item.id, status: "DONE" });
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;
  if (data.items.length === 0)
    return (
      <Card>
        <EmptyState icon={LuSparkles} title="No cleaning tasks for today" message="A manager can add daily and weekly tasks under “Manage tasks”." />
      </Card>
    );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {SHIFTS.map((shift) => {
        const items = data.items.filter((i) => i.shift === shift.value);
        if (!items.length) return null;
        const done = items.filter((i) => i.status === "DONE").length;
        return (
          <Card key={shift.value}>
            <CardHeader title={`${shift.emoji}  ${shift.label}`} subtitle={`${done}/${items.length} done`} />
            <ul className="space-y-1.5 px-3 pb-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3 py-3 transition",
                    item.status === "DONE"
                      ? "border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                      : item.status === "ISSUE"
                        ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/5"
                        : "border-line hover:border-brand-200",
                  )}
                >
                  <button
                    onClick={() => tick(item)}
                    disabled={busy === item.id}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-90"
                    aria-label={item.status === "DONE" ? `Undo ${item.title}` : `Mark ${item.title} done`}
                  >
                    {item.status === "DONE" ? (
                      <LuCircleCheck className="h-8 w-8 text-emerald-500" />
                    ) : item.status === "ISSUE" ? (
                      <LuCircleAlert className="h-8 w-8 text-amber-500" />
                    ) : (
                      <LuCircle className="h-8 w-8 text-line-strong" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold text-ink", item.status === "DONE" && "text-ink-soft line-through decoration-emerald-500/60")}>{item.title}</p>
                    <p className="truncate text-xs text-muted">
                      {item.area}
                      {item.branch && ` · ${item.branch.name}`}
                      {item.assignedTo && ` · ${item.assignedTo.name}`}
                      {item.status === "DONE" && item.doneBy && ` · ✓ ${item.doneBy} ${item.doneAt ? formatTime(item.doneAt) : ""}`}
                    </p>
                    {item.note && <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">⚠ {item.note}</p>}
                  </div>
                  {item.status !== "DONE" && (
                    <button
                      onClick={() => onReport({ taskId: item.id, area: item.area, title: item.title })}
                      className="rounded-lg p-2 text-muted hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                      aria-label={`Report a problem with ${item.title}`}
                    >
                      <LuTriangleAlert className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function IssuesList({ data, reload, readOnly }: { data: HousekeepingToday | undefined; reload: () => void; readOnly?: boolean }) {
  const toast = useToast();
  const resolve = async (id: string) => {
    try {
      await api.post(`/api/housekeeping/logs/${id}`);
      toast("success", "Marked as fixed");
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };
  return (
    <Card>
      <CardHeader title="Open problems" subtitle="Reported by the cleaning team" icon={<LuTriangleAlert className="h-[18px] w-[18px]" />} />
      {!data && <Skeleton className="m-5 h-24" />}
      {data && data.openIssues.length === 0 && <EmptyState icon={LuCircleCheck} title="No open problems" message="Everything reported has been fixed." />}
      <ul className="divide-y divide-line/70 px-2 pb-2">
        {data?.openIssues.map((i) => (
          <li key={i.id} className="flex items-start gap-3 px-3 py-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10">
              <LuTriangleAlert className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{i.note ?? i.title ?? "Problem reported"}</p>
              <p className="text-xs text-muted">
                {i.area}
                {i.title && i.note ? ` · ${i.title}` : ""} · {i.reportedBy ?? "Staff"} · {timeAgo(i.reportedAt)}
              </p>
            </div>
            {!readOnly && (
              <Button size="sm" variant="soft" onClick={() => resolve(i.id)}>
                <LuCircleCheck className="h-3.5 w-3.5" /> Fixed
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ReportModal({ state, onClose, onDone }: { state: { taskId?: string; area?: string; title?: string } | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [area, setArea] = useState("General");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (state) {
      setArea(state.area ?? "General");
      setNote("");
    }
  }, [state]);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/api/housekeeping/logs", { taskId: state?.taskId ?? null, status: "ISSUE", note, area });
      toast("success", "Problem reported — the manager will see it");
      onDone();
      onClose();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title="Report a problem"
      description={state?.title ? `With: ${state.title}` : "Broken equipment, leaks, missing supplies…"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={note.trim().length < 3}>
            Report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!state?.taskId && (
          <Field label="Where?">
            <Select value={area} onChange={(e) => setArea(e.target.value)}>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="What's the problem?">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Treadmill 3 belt is torn · Ladies' shower 2 drain blocked" autoFocus />
        </Field>
      </div>
    </Modal>
  );
}

const blankTask = { area: "Gym floor", title: "", frequency: "DAILY" as "DAILY" | "WEEKLY", weekday: 5, shift: "MORNING" as Shift, branchId: "", assignedToId: "", isActive: true };

function TaskManager({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const branches = useBranches();
  const tasks = useApi<{ tasks: HousekeepingTask[] }>("/api/housekeeping/tasks");
  const cleaners = useApi<{ staff: { id: string; name: string }[] }>("/api/staff/trainers?role=HOUSEKEEPING");
  const [edit, setEdit] = useState<HousekeepingTask | "new" | null>(null);
  const [form, setForm] = useState(blankTask);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (edit === "new") setForm(blankTask);
    else if (edit)
      setForm({
        area: edit.area,
        title: edit.title,
        frequency: edit.frequency,
        weekday: edit.weekday ?? 5,
        shift: edit.shift,
        branchId: edit.branchId ?? "",
        assignedToId: edit.assignedToId ?? "",
        isActive: edit.isActive,
      });
  }, [edit]);

  const grouped = useMemo(() => {
    const m = new Map<string, HousekeepingTask[]>();
    for (const t of tasks.data?.tasks ?? []) m.set(t.area, [...(m.get(t.area) ?? []), t]);
    return [...m.entries()];
  }, [tasks.data]);

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...form, branchId: form.branchId || null, assignedToId: form.assignedToId || null, weekday: form.frequency === "WEEKLY" ? form.weekday : null };
      if (edit === "new") await api.post("/api/housekeeping/tasks", body);
      else if (edit) await api.put(`/api/housekeeping/tasks/${edit.id}`, body);
      toast("success", "Task saved");
      setEdit(null);
      tasks.reload();
      onChanged();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: HousekeepingTask) => {
    if (!(await confirm({ title: `Delete “${t.title}”?`, message: "Past ticks stay in the history.", confirmLabel: "Delete", danger: true }))) return;
    await api.del(`/api/housekeeping/tasks/${t.id}`).catch(() => {});
    tasks.reload();
    onChanged();
  };

  return (
    <Card>
      <CardHeader
        title="Cleaning tasks"
        subtitle="Daily tasks appear every day; weekly tasks on their day"
        action={
          <Button size="sm" onClick={() => setEdit("new")}>
            <LuPlus className="h-3.5 w-3.5" /> Add task
          </Button>
        }
      />
      {!tasks.data && <Skeleton className="m-5 h-40" />}
      {tasks.data?.tasks.length === 0 && <EmptyState icon={LuSparkles} title="No tasks yet" />}
      <div className="space-y-5 px-5 pb-5">
        {grouped.map(([area, list]) => (
          <div key={area}>
            <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{area}</p>
            <ul className="divide-y divide-line/70 rounded-2xl border border-line">
              {list.map((t) => (
                <li key={t.id} className={cn("flex items-center gap-3 px-4 py-3", !t.isActive && "opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{t.title}</p>
                    <p className="text-xs text-muted">
                      {t.frequency === "DAILY" ? "Every day" : `Every ${WEEKDAYS[t.weekday ?? 0]}`} · {SHIFTS.find((s) => s.value === t.shift)?.label}
                      {t.branch && ` · ${t.branch.name}`}
                    </p>
                  </div>
                  {t.assignedTo && (
                    <Badge tone="gray">
                      <LuUser className="h-3 w-3" /> {t.assignedTo.name}
                    </Badge>
                  )}
                  {!t.isActive && <Badge tone="gray">Paused</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => setEdit(t)} aria-label="Edit task">
                    <LuPencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(t)} aria-label="Delete task" className="hover:text-rose-600">
                    <LuTrash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit === "new" ? "New cleaning task" : "Edit task"}
        footer={
          <Button onClick={save} loading={busy} disabled={!form.title.trim()}>
            Save
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Task" required className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Wipe down all cardio machines" />
          </Field>
          <Field label="Area">
            <Select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="Shift">
            <Select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as Shift })}>
              {SHIFTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="How often">
            <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as "DAILY" | "WEEKLY" })}>
              <option value="DAILY">Every day</option>
              <option value="WEEKLY">Once a week</option>
            </Select>
          </Field>
          {form.frequency === "WEEKLY" ? (
            <Field label="On">
              <Select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>
                {WEEKDAYS.map((w, i) => (
                  <option key={w} value={i}>
                    {w}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div />
          )}
          <Field label="Branch">
            <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assigned to">
            <Select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
              <option value="">Anyone on shift</option>
              {cleaners.data?.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Active" />
          </div>
        </div>
      </Modal>
    </Card>
  );
}
