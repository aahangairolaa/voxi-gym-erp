"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuDumbbell, LuPencil, LuPlus, LuTrash2, LuUserPlus, LuClipboardList, LuFlame, LuTimer } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { MemberPicker } from "@/components/members/member-picker";
import {
  Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, Textarea, useConfirm, useToast,
} from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useTrainers } from "@/hooks/use-lookups";
import { useQueryParam } from "@/hooks/use-query-param";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import type { Exercise, SearchResult, WorkoutLog, WorkoutPlan } from "@/types/api";

type Item = { exerciseId: string; day: number; sets: number; reps: string; restSeconds: number };
type PlanForm = { name: string; goal: string; level: string; description: string; daysPerWeek: number; trainerId: string; items: Item[] };
const blank: PlanForm = { name: "", goal: "", level: "Beginner", description: "", daysPerWeek: 3, trainerId: "", items: [] };
const LEVEL_TONE: Record<string, "green" | "amber" | "red"> = { Beginner: "green", Intermediate: "amber", Advanced: "red" };

export default function WorkoutsPage() {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const trainers = useTrainers();
  const openPlanId = useQueryParam("plan");
  const [tab, setTab] = useState<"templates" | "members" | "log">("templates");
  const plans = useApi<{ plans: WorkoutPlan[] }>("/api/workouts");
  const exercises = useApi<{ exercises: Exercise[] }>("/api/workouts/exercises");
  const logs = useApi<{ logs: WorkoutLog[] }>(tab === "log" ? "/api/workouts/logs" : null);
  const [viewing, setViewing] = useState<WorkoutPlan | null>(null);
  const [editing, setEditing] = useState<WorkoutPlan | "new" | null>(null);
  const [form, setForm] = useState<PlanForm>(blank);
  const [assignTo, setAssignTo] = useState<{ plan: WorkoutPlan; member: SearchResult | null } | null>(null);
  const [logging, setLogging] = useState(false);
  const [logForm, setLogForm] = useState<{ member: SearchResult | null; workoutPlanId: string; durationMin: number; calories: number | ""; notes: string }>({
    member: null, workoutPlanId: "", durationMin: 60, calories: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const all = plans.data?.plans ?? [];
  const templates = all.filter((p) => !p.member);
  const assigned = all.filter((p) => p.member);
  const exList = exercises.data?.exercises ?? [];
  const byGroup = useMemo(() => {
    const g: Record<string, Exercise[]> = {};
    exList.forEach((e) => (g[e.muscleGroup] ??= []).push(e));
    return g;
  }, [exList]);

  useEffect(() => {
    if (openPlanId && all.length) {
      const p = all.find((x) => x.id === openPlanId);
      if (p) setViewing(p);
    }
  }, [openPlanId, all.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editing === "new") setForm({ ...blank, trainerId: user.role === "TRAINER" ? user.staffId : "" });
    else if (editing)
      setForm({
        name: editing.name, goal: editing.goal ?? "", level: editing.level ?? "Beginner", description: editing.description ?? "",
        daysPerWeek: editing.daysPerWeek, trainerId: editing.trainer?.id ?? "",
        items: editing.items.map((i) => ({ exerciseId: i.exerciseId, day: i.day, sets: i.sets, reps: i.reps, restSeconds: i.restSeconds })),
      });
  }, [editing, user]);

  const savePlan = async () => {
    setSaving(true);
    try {
      const body = { ...form, goal: form.goal || null, description: form.description || null, trainerId: form.trainerId || null, memberId: editing !== "new" && editing ? editing.member?.id ?? null : null };
      if (editing === "new") await api.post("/api/workouts", body);
      else if (editing) await api.put(`/api/workouts/${editing.id}`, body);
      toast("success", "Programme saved");
      setEditing(null);
      plans.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: WorkoutPlan) => {
    if (!(await confirm({ title: `Delete “${p.name}”?`, danger: true, confirmLabel: "Delete" }))) return;
    await api.del(`/api/workouts/${p.id}`);
    setViewing(null);
    plans.reload();
  };

  const assign = async () => {
    if (!assignTo?.member) return;
    setSaving(true);
    try {
      await api.post(`/api/workouts/${assignTo.plan.id}/assign`, { memberId: assignTo.member.id });
      toast("success", `Assigned to ${assignTo.member.name}`);
      setAssignTo(null);
      plans.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const saveLog = async () => {
    if (!logForm.member) return;
    setSaving(true);
    try {
      await api.post("/api/workouts/logs", {
        memberId: logForm.member.id, workoutPlanId: logForm.workoutPlanId || null, durationMin: logForm.durationMin,
        calories: logForm.calories === "" ? null : logForm.calories, notes: logForm.notes || null,
      });
      toast("success", "Workout logged and points added to the leaderboard");
      setLogging(false);
      setLogForm({ member: null, workoutPlanId: "", durationMin: 60, calories: "", notes: "" });
      logs.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const PlanCard = ({ p }: { p: WorkoutPlan }) => {
    const days = new Set(p.items.map((i) => i.day)).size;
    const groups = [...new Set(p.items.map((i) => i.exercise.muscleGroup))].slice(0, 4);
    return (
      <Card hover className="flex cursor-pointer flex-col p-5" onClick={() => setViewing(p)}>
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <LuDumbbell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="truncate text-xs text-muted">{p.member ? p.member.name : p.goal ?? "General"}</p>
          </div>
          {p.level && <Badge tone={LEVEL_TONE[p.level] ?? "gray"}>{p.level}</Badge>}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <span key={g} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
              {g}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
          <span>
            {days} days · {p.items.length} exercises
          </span>
          <span>{p.trainer?.name.replace("Coach ", "") ?? "–"}</span>
        </div>
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        title="Workouts"
        subtitle="Build programmes, assign them to members and log sessions"
        actions={
          <>
            <Button variant="secondary" onClick={() => setLogging(true)}>
              <LuFlame className="h-4 w-4" /> Log workout
            </Button>
            <Button onClick={() => setEditing("new")}>
              <LuPlus className="h-4 w-4" /> New programme
            </Button>
          </>
        }
      />
      <Segmented
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: "templates", label: "Programme library", count: templates.length },
          { value: "members", label: "Member programmes", count: assigned.length },
          { value: "log", label: "Workout log" },
        ]}
      />

      {plans.loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>}

      {tab === "templates" && (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((p) => <PlanCard key={p.id} p={p} />)}
          {plans.data && templates.length === 0 && <EmptyState icon={LuClipboardList} title="No programmes yet" />}
        </div>
      )}
      {tab === "members" && (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assigned.map((p) => <PlanCard key={p.id} p={p} />)}
          {plans.data && assigned.length === 0 && <EmptyState title="No member programmes yet" message="Open a programme from the library and assign it to a member." />}
        </div>
      )}
      {tab === "log" && (
        <Card>
          {logs.loading && <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>}
          {logs.data && (
            <div className="overflow-x-auto">
              <table className="table min-w-[620px]">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Programme</th>
                    <th>When</th>
                    <th className="text-right">Duration</th>
                    <th className="text-right">Calories</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.logs.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link href={`/members/${l.member.id}`} className="flex items-center gap-2.5 font-semibold hover:text-brand-600">
                          <Avatar name={l.member.name} size={28} /> {l.member.name}
                        </Link>
                      </td>
                      <td className="text-ink-soft">{l.plan ?? "Free session"}</td>
                      <td className="text-ink-soft">{formatDateTime(l.loggedAt)}</td>
                      <td className="text-right tabular-nums">{l.durationMin} min</td>
                      <td className="text-right tabular-nums">{l.calories ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* View programme */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing?.name ?? ""}
        description={viewing ? [viewing.goal, viewing.level, `${viewing.daysPerWeek} days/week`, viewing.trainer?.name, viewing.member ? `for ${viewing.member.name}` : null].filter(Boolean).join(" · ") : ""}
        footer={
          viewing && (
            <>
              <Button variant="ghost" className="text-rose-600 sm:mr-auto" onClick={() => remove(viewing)}>
                <LuTrash2 className="h-4 w-4" /> Delete
              </Button>
              <Button variant="secondary" onClick={() => { setEditing(viewing); setViewing(null); }}>
                <LuPencil className="h-4 w-4" /> Edit
              </Button>
              {!viewing.member && (
                <Button onClick={() => { setAssignTo({ plan: viewing, member: null }); setViewing(null); }}>
                  <LuUserPlus className="h-4 w-4" /> Assign to member
                </Button>
              )}
            </>
          )
        }
      >
        {viewing?.description && <p className="mb-4 text-sm text-muted">{viewing.description}</p>}
        <div className="space-y-5">
          {viewing &&
            [...new Set(viewing.items.map((i) => i.day))].sort().map((day) => (
              <div key={day}>
                <p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Day {day}</p>
                <div className="overflow-hidden rounded-xl border border-line">
                  {viewing.items
                    .filter((i) => i.day === day)
                    .map((i, idx) => (
                      <div key={i.id} className="flex items-center gap-3 border-b border-line/70 px-4 py-2.5 text-sm last:border-0">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-muted">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{i.exercise.name}</p>
                          <p className="text-xs text-muted">{i.exercise.muscleGroup} · {i.exercise.equipment}</p>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {i.sets} × {i.reps}
                        </span>
                        <span className="hidden w-16 text-right text-xs text-muted sm:block">{i.restSeconds ? `${i.restSeconds}s rest` : ""}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </Modal>

      {/* Builder */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="xl"
        title={editing === "new" ? "New programme" : "Edit programme"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={savePlan} loading={saving} disabled={!form.name || form.items.length === 0}>
              Save programme
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Shred 4-Day" />
          </Field>
          <Field label="Goal">
            <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Fat loss" />
          </Field>
          <Field label="Level">
            <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </Select>
          </Field>
          <Field label="Days / week">
            <Input type="number" min={1} max={7} value={form.daysPerWeek} onChange={(e) => setForm({ ...form, daysPerWeek: Number(e.target.value) || 1 })} />
          </Field>
          <Field label="Trainer">
            <Select value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })}>
              <option value="">Not set</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Exercises ({form.items.length})</span>
            <Button
              size="sm"
              variant="soft"
              onClick={() =>
                setForm({
                  ...form,
                  items: [...form.items, { exerciseId: exList[0]?.id ?? "", day: form.items.at(-1)?.day ?? 1, sets: 3, reps: "10", restSeconds: 60 }],
                })
              }
            >
              <LuPlus className="h-3.5 w-3.5" /> Add exercise
            </Button>
          </div>
          <div className="space-y-2">
            {form.items.map((it, idx) => {
              const update = (patch: Partial<Item>) => setForm({ ...form, items: form.items.map((x, i) => (i === idx ? { ...x, ...patch } : x)) });
              return (
                <div key={idx} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-line p-2">
                  <Select className="col-span-12 sm:col-span-5" value={it.exerciseId} onChange={(e) => update({ exerciseId: e.target.value })}>
                    {Object.entries(byGroup).map(([g, list]) => (
                      <optgroup key={g} label={g}>
                        {list.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                  <Select className="col-span-3 sm:col-span-2" value={it.day} onChange={(e) => update({ day: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
                    ))}
                  </Select>
                  <Input className="col-span-2 sm:col-span-1" type="number" min={1} value={it.sets} onChange={(e) => update({ sets: Number(e.target.value) || 1 })} title="Sets" />
                  <Input className="col-span-3 sm:col-span-2" value={it.reps} onChange={(e) => update({ reps: e.target.value })} title="Reps" placeholder="8-12" />
                  <Input className="col-span-3 sm:col-span-1" type="number" min={0} value={it.restSeconds} onChange={(e) => update({ restSeconds: Number(e.target.value) || 0 })} title="Rest (s)" />
                  <button className="col-span-1 grid place-items-center rounded-lg p-2 text-muted hover:text-rose-600" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} aria-label="Remove">
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {form.items.length === 0 && <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">Add exercises to build the programme. Columns: exercise · day · sets · reps · rest (s).</p>}
          </div>
        </div>
      </Modal>

      {/* Assign */}
      <Modal
        open={!!assignTo}
        onClose={() => setAssignTo(null)}
        title="Assign programme"
        description={assignTo?.plan.name}
        footer={
          <Button onClick={assign} loading={saving} disabled={!assignTo?.member}>
            Assign
          </Button>
        }
      >
        <p className="mb-3 text-sm text-muted">A personal copy is created so you can adjust it for this member.</p>
        {assignTo && <MemberPicker value={assignTo.member} onChange={(m) => setAssignTo({ ...assignTo, member: m })} autoFocus />}
      </Modal>

      {/* Log workout */}
      <Modal
        open={logging}
        onClose={() => setLogging(false)}
        title="Log a workout"
        description="Earns leaderboard points"
        footer={
          <Button onClick={saveLog} loading={saving} disabled={!logForm.member}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Member" required>
            <MemberPicker value={logForm.member} onChange={(m) => setLogForm({ ...logForm, member: m })} />
          </Field>
          <Field label="Programme">
            <Select value={logForm.workoutPlanId} onChange={(e) => setLogForm({ ...logForm, workoutPlanId: e.target.value })}>
              <option value="">Free session</option>
              {all
                .filter((p) => !logForm.member || !p.member || p.member.id === logForm.member.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.member ? ` (${p.member.name})` : ""}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (min)">
              <div className="relative">
                <LuTimer className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input type="number" min={1} className="pl-9" value={logForm.durationMin} onChange={(e) => setLogForm({ ...logForm, durationMin: Number(e.target.value) || 1 })} />
              </div>
            </Field>
            <Field label="Calories">
              <Input type="number" min={0} value={logForm.calories} onChange={(e) => setLogForm({ ...logForm, calories: e.target.value === "" ? "" : Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={2} value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
