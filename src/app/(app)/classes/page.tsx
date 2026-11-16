"use client";
import { useEffect, useMemo, useState } from "react";
import { LuCalendarDays, LuChevronLeft, LuChevronRight, LuClock, LuMapPin, LuPlus, LuTrash2, LuUsers } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { MemberPicker } from "@/components/members/member-picker";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, useConfirm, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useBranches, useTrainers } from "@/hooks/use-lookups";
import { api, withQuery } from "@/lib/api-client";
import { addDays, qatarParts, startOfDay, toDateInput } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GymClass, SearchResult } from "@/types/api";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const blank = { name: "", description: "", trainerId: "", branchId: "", room: "", date: toDateInput(), time: "18:00", durationMin: 60, capacity: 15 };

export default function ClassesPage() {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const trainers = useTrainers();
  const branches = useBranches();
  const [weekStart, setWeekStart] = useState(() => startOfDay());
  const [selected, setSelected] = useState(() => toDateInput());
  const { data, loading, reload } = useApi<{ classes: GymClass[] }>(withQuery("/api/classes", { from: toDateInput(weekStart), days: 7 }));
  const [open, setOpen] = useState<GymClass | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blank);
  const [booking, setBooking] = useState<SearchResult | null>(null);
  const [saving, setSaving] = useState(false);
  const canManage = user.role !== "RECEPTION";

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const classes = data?.classes ?? [];
  const dayClasses = classes.filter((c) => toDateInput(new Date(c.startsAt)) === selected);

  // keep the open class fresh after changes
  useEffect(() => {
    if (open) setOpen(classes.find((c) => c.id === open.id) ?? null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setSaving(true);
    try {
      await api.post("/api/classes", {
        name: form.name, description: form.description || null, trainerId: form.trainerId || null, branchId: form.branchId || null,
        room: form.room || null, startsAt: `${form.date}T${form.time}:00+03:00`, durationMin: form.durationMin, capacity: form.capacity,
      });
      toast("success", "Class scheduled");
      setCreating(false);
      setSelected(form.date);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const book = async () => {
    if (!open || !booking) return;
    try {
      await api.post(`/api/classes/${open.id}/bookings`, { memberId: booking.id });
      toast("success", `${booking.name} booked`);
      setBooking(null);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const setStatus = async (bookingId: string, status: string) => {
    if (!open) return;
    await api.patch(`/api/classes/${open.id}/bookings`, { bookingId, status });
    reload();
  };

  const removeClass = async () => {
    if (!open || !(await confirm({ title: `Delete ${open.name}?`, message: "All bookings for this class will be removed.", danger: true, confirmLabel: "Delete class" }))) return;
    await api.del(`/api/classes/${open.id}`);
    setOpen(null);
    reload();
  };

  const p0 = qatarParts(days[0]!);
  const p6 = qatarParts(days[6]!);

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="Group class schedule and bookings"
        actions={
          canManage && (
            <Button onClick={() => { setForm({ ...blank, date: selected }); setCreating(true); }}>
              <LuPlus className="h-4 w-4" /> Schedule class
            </Button>
          )
        }
      />

      <Card className="mb-5 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-sm font-semibold">
            {p0.day} {MON[p0.month]} – {p6.day} {MON[p6.month]} {p6.year}
          </p>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
              <LuChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setWeekStart(startOfDay()); setSelected(toDateInput()); }}>
              Today
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
              <LuChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const key = toDateInput(d);
            const p = qatarParts(d);
            const count = classes.filter((c) => toDateInput(new Date(c.startsAt)) === key).length;
            const active = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={cn(
                  "flex flex-col items-center rounded-xl py-2.5 transition-all duration-200",
                  active ? "text-white brand-gradient shadow-[0_8px_20px_-8px_rgba(106,68,242,0.8)]" : "hover:bg-surface-2",
                )}
              >
                <span className={cn("text-[11px] font-semibold", active ? "text-white/80" : "text-muted")}>{DAY[p.weekday]}</span>
                <span className="font-display text-lg font-semibold">{p.day}</span>
                <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", count ? (active ? "bg-white" : "bg-brand-500") : "bg-transparent")} />
              </button>
            );
          })}
        </div>
      </Card>

      {loading && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>}
      {data && dayClasses.length === 0 && (
        <Card>
          <EmptyState icon={LuCalendarDays} title="No classes on this day" action={canManage && <Button onClick={() => { setForm({ ...blank, date: selected }); setCreating(true); }}>Schedule one</Button>} />
        </Card>
      )}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dayClasses.map((c) => {
          const pct = Math.min(100, Math.round((c.booked / c.capacity) * 100));
          const past = new Date(c.startsAt) < new Date();
          return (
            <Card key={c.id} hover className={cn("cursor-pointer p-5", past && "opacity-70")} onClick={() => setOpen(c)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl font-semibold tabular-nums">{formatTime(c.startsAt)}</p>
                  <p className="text-xs text-muted">{c.durationMin} min</p>
                </div>
                {pct >= 100 ? <Badge tone="red">Full</Badge> : pct >= 80 ? <Badge tone="amber">Almost full</Badge> : past ? <Badge>Done</Badge> : <Badge tone="green">Open</Badge>}
              </div>
              <p className="mt-4 text-lg font-semibold">{c.name}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Avatar name={c.trainer?.name ?? "?"} size={16} /> {c.trainer?.name ?? "No trainer"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <LuMapPin className="h-3 w-3" /> {c.room ?? "—"} · {c.branch?.name ?? ""}
                </span>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-muted">
                    <LuUsers className="h-3.5 w-3.5" /> Booked
                  </span>
                  <span className="font-semibold tabular-nums">
                    {c.booked}/{c.capacity}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Class detail */}
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name ?? ""}
        description={open ? `${formatTime(open.startsAt)} · ${open.durationMin} min · ${open.trainer?.name ?? "No trainer"} · ${open.room ?? ""}` : ""}
        footer={
          canManage &&
          user.role !== "TRAINER" && (
            <Button variant="ghost" className="text-rose-600" onClick={removeClass}>
              <LuTrash2 className="h-4 w-4" /> Delete class
            </Button>
          )
        }
      >
        {open && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <MemberPicker value={booking} onChange={setBooking} placeholder="Book a member…" />
              </div>
              <Button onClick={book} disabled={!booking || open.booked >= open.capacity}>
                Book
              </Button>
            </div>
            <p className="text-xs font-bold tracking-wider text-muted uppercase">
              Attendees ({open.booked}/{open.capacity})
            </p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {open.bookings.length === 0 && <li className="p-4 text-center text-sm text-muted">No bookings yet</li>}
              {open.bookings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={b.member.name} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{b.member.name}</span>
                  <Select value={b.status} onChange={(e) => setStatus(b.id, e.target.value)} className="h-8 w-32 text-xs">
                    <option value="BOOKED">Booked</option>
                    <option value="ATTENDED">Attended</option>
                    <option value="NO_SHOW">No-show</option>
                    <option value="CANCELLED">Cancel</option>
                  </Select>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      {/* New class */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Schedule a class"
        footer={
          <Button onClick={create} loading={saving} disabled={!form.name}>
            Schedule
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. HIIT Burn" />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Start time">
            <div className="relative">
              <LuClock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input type="time" className="pl-9" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </Field>
          <Field label="Duration (min)">
            <Input type="number" min={10} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) || 60 })} />
          </Field>
          <Field label="Capacity">
            <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 1 })} />
          </Field>
          <Field label="Trainer">
            <Select value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })}>
              <option value="">—</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Branch">
            <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Room / studio" className="sm:col-span-2">
            <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Studio A" />
          </Field>
        </div>
      </Modal>
    </>
  );
}
