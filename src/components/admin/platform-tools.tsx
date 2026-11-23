"use client";
import { useEffect, useState } from "react";
import {
  LuBell, LuCalendarClock, LuCircleAlert, LuDatabase, LuDownload, LuHourglass, LuMegaphone, LuMoon, LuSend, LuTrash2, LuTriangleAlert,
} from "react-icons/lu";
import { BarChart } from "@/components/charts";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Select, Skeleton, Textarea, useConfirm, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { api, fieldErrors } from "@/lib/api-client";
import { addDays, addMonths, qatarParts, toDateInput } from "@/lib/dates";
import { formatDate, timeAgo } from "@/lib/format";
import { termFor } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { AdminGym } from "@/types/api";

export type Storage = {
  database: { bytes: number; tables: { name: string; bytes: number; rows: number }[] };
  gyms: { gymId: string; bytes: number; photoBytes: number; photos: number }[];
};

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

const DAY = 86_400_000;
export const daysUntil = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : null);

/** Quick changes to a gym from lists (mark paid, extend trial…), with a toast. */
export function useGymActions(onChanged: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (g: AdminGym, body: object, msg: string) => {
    setBusy(g.id);
    try {
      await api.put(`/api/admin/gyms/${g.id}`, body);
      toast("success", msg);
      onChanged();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };
  return {
    busy,
    act,
    extendTrial: (g: AdminGym) => {
      const base = g.trialEndsAt && new Date(g.trialEndsAt).getTime() > Date.now() ? new Date(g.trialEndsAt) : new Date();
      return act(g, { status: "TRIAL", trialEndsAt: toDateInput(addDays(base, 7)) }, `${g.name}: trial extended by 7 days`);
    },
    markPaid: (g: AdminGym) => {
      const base = g.paidUntil && new Date(g.paidUntil).getTime() > Date.now() ? new Date(g.paidUntil) : new Date();
      return act(g, { status: "ACTIVE", paidUntil: toDateInput(addMonths(base, g.billingMonths)) }, `${g.name}: paid for another ${termFor(g.billingMonths).label}`);
    },
    activate: (g: AdminGym) => act(g, { applyRequest: true }, `${g.name} is now active`),
    decline: (g: AdminGym) => act(g, { declineRequest: true }, `${g.name}'s request was declined`),
  };
}

// ── Needs attention ──────────────────────────────────────────────────────────
type Item = { gym: AdminGym; kind: "request" | "trial" | "renewal" | "quiet"; text: string };

/** Gyms that need the VOXI team: plan requests, trials ending, payments due, gyms gone quiet. */
export function NeedsAttention({ gyms, onOpen, onChanged }: { gyms: AdminGym[]; onOpen: (g: AdminGym) => void; onChanged: () => void }) {
  const { busy, extendTrial, markPaid } = useGymActions(onChanged);
  const items: Item[] = [];
  for (const g of gyms) {
    if (g.status === "SUSPENDED") continue;
    if (g.planRequest) items.push({ gym: g, kind: "request", text: `Requested ${termFor(g.planRequest.months).label}${g.planRequest.totalToday != null ? `, invoice QAR ${g.planRequest.totalToday.toLocaleString("en")}` : ""}` });
    const t = g.status === "TRIAL" ? daysUntil(g.trialEndsAt) : null;
    if (t !== null && t <= 3) items.push({ gym: g, kind: "trial", text: t < 0 ? `Trial ended ${-t} day${t === -1 ? "" : "s"} ago` : t === 0 ? "Trial ends today" : `Trial ends in ${t} day${t === 1 ? "" : "s"}` });
    const p = g.status === "ACTIVE" ? daysUntil(g.paidUntil) : null;
    if (p !== null && p <= 14) items.push({ gym: g, kind: "renewal", text: p < 0 ? `Payment overdue by ${-p} day${p === -1 ? "" : "s"}` : `Renewal due in ${p} day${p === 1 ? "" : "s"} (${formatDate(g.paidUntil!)})` });
    const quiet = g.lastActiveAt ? (Date.now() - new Date(g.lastActiveAt).getTime()) / DAY : Infinity;
    if (quiet >= 14 && (Date.now() - new Date(g.createdAt).getTime()) / DAY >= 3) items.push({ gym: g, kind: "quiet", text: g.lastActiveAt ? `Nobody has signed in for ${Math.floor(quiet)} days` : "Nobody has signed in yet" });
  }
  const order = { request: 0, renewal: 1, trial: 2, quiet: 3 };
  items.sort((a, b) => order[a.kind] - order[b.kind]);


  const ICON = { request: LuBell, trial: LuHourglass, renewal: LuCalendarClock, quiet: LuMoon };
  const TONE = { request: "text-brand-600 bg-brand-50 dark:bg-brand-500/15 dark:text-brand-300", trial: "text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300", renewal: "text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300", quiet: "text-muted bg-surface-2" };

  return (
    <Card>
      <CardHeader title="Needs attention" subtitle={items.length ? `${items.length} thing${items.length === 1 ? "" : "s"} to follow up` : "All clear"} />
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">No plan requests, renewals, ending trials or quiet gyms right now.</p>
      ) : (
        <ul className="max-h-[360px] divide-y divide-line overflow-y-auto">
          {items.map((it, i) => {
            const Icon = ICON[it.kind];
            return (
              <li key={`${it.gym.id}-${it.kind}-${i}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", TONE[it.kind])}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{it.gym.name}</p>
                  <p className="text-xs text-muted">
                    {it.text}
                    {it.gym.owner ? ` · ${it.gym.owner.name}` : ""}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {it.kind === "trial" && (
                    <Button size="sm" variant="secondary" loading={busy === it.gym.id} onClick={() => extendTrial(it.gym)}>
                      +7 days
                    </Button>
                  )}
                  {it.kind === "renewal" && (
                    <Button size="sm" variant="secondary" loading={busy === it.gym.id} onClick={() => markPaid(it.gym)}>
                      Mark paid
                    </Button>
                  )}
                  {it.kind === "quiet" && it.gym.owner?.email && (
                    <a href={`mailto:${it.gym.owner.email}?subject=${encodeURIComponent("Checking in from VOXI")}`} className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10">
                      Email owner
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onOpen(it.gym)}>
                    {it.kind === "request" ? "Review" : "Open"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Growth ───────────────────────────────────────────────────────────────────
/** New gyms per month for the last 12 months, and how many trials turned into paying gyms. */
export function GrowthCard({ gyms }: { gyms: AdminGym[] }) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = addMonths(now, i - 11);
    const { month, year } = qatarParts(d);
    return { key: `${year}-${month}`, label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month]!, n: 0 };
  });
  for (const g of gyms) {
    const { month, year } = qatarParts(new Date(g.createdAt));
    const m = months.find((x) => x.key === `${year}-${month}`);
    if (m) m.n++;
  }
  const decided = gyms.filter((g) => g.status === "ACTIVE" || (g.status === "TRIAL" && (daysUntil(g.trialEndsAt) ?? 1) < 0) || g.status === "SUSPENDED");
  const conversion = decided.length ? Math.round((gyms.filter((g) => g.status === "ACTIVE").length / decided.length) * 100) : null;
  const thisMonth = months[11]!.n;

  return (
    <Card>
      <CardHeader title="Growth" subtitle="New gyms per month" />
      <div className="flex flex-wrap gap-x-8 gap-y-2 px-5">
        <div>
          <p className="text-xs text-muted">New this month</p>
          <p className="font-display text-2xl font-semibold text-ink tabular-nums">{thisMonth}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Trial to paying</p>
          <p className="font-display text-2xl font-semibold text-ink tabular-nums">{conversion === null ? "–" : `${conversion}%`}</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <BarChart height={180} labels={months.map((m) => m.label)} series={[{ name: "New gyms", color: "#7c5cff", values: months.map((m) => m.n) }]} />
      </div>
    </Card>
  );
}

// ── Storage ──────────────────────────────────────────────────────────────────
/** Database size and the gyms using the most space. */
export function StorageCard({ storage, gyms }: { storage: Storage | undefined; gyms: AdminGym[] }) {
  if (!storage) {
    return (
      <Card>
        <CardHeader title="Database storage" />
        <div className="px-5 pb-5">
          <Skeleton className="h-32" />
        </div>
      </Card>
    );
  }
  const top = storage.gyms.slice(0, 5);
  const max = Math.max(1, ...top.map((g) => g.bytes));
  const name = (id: string) => gyms.find((g) => g.id === id)?.name ?? "Deleted gym";
  return (
    <Card>
      <CardHeader title="Database storage" subtitle="Approximate; photos are measured exactly" />
      <div className="flex items-center gap-3 px-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <LuDatabase className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-2xl font-semibold text-ink tabular-nums">{formatBytes(storage.database.bytes)}</p>
          <p className="text-xs text-muted">Whole database, all gyms</p>
        </div>
      </div>
      <ul className="mt-4 space-y-3 px-5 pb-5">
        {top.map((g) => (
          <li key={g.gymId}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-ink">{name(g.gymId)}</span>
              <span className="shrink-0 text-muted tabular-nums">{formatBytes(g.bytes)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full brand-gradient" style={{ width: `${(g.bytes / max) * 100}%` }} />
            </div>
            {g.photos > 0 && <p className="mt-1 text-[11px] text-muted">{g.photos} photos, {formatBytes(g.photoBytes)}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Announcements ────────────────────────────────────────────────────────────
type Notice = { id: string; message: string; tone: "INFO" | "WARNING" | "SUCCESS"; audience: "ALL" | "TRIAL" | "ACTIVE"; link: string | null; active: boolean; endsAt: string | null; createdAt: string };

/** Post a message every gym sees at the top of VOXI (one at a time). */
export function Announcements() {
  const toast = useToast();
  const { data, reload } = useApi<{ notices: Notice[] }>("/api/admin/notices");
  const [f, setF] = useState({ message: "", tone: "INFO", audience: "ALL", link: "", endsAt: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const live = data?.notices.find((n) => n.active && (!n.endsAt || new Date(n.endsAt).getTime() > Date.now()));

  const post = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.post("/api/admin/notices", { ...f, link: f.link || null, endsAt: f.endsAt || null });
      toast("success", "Announcement is live for gyms");
      setF({ message: "", tone: "INFO", audience: "ALL", link: "", endsAt: "" });
      reload();
    } catch (e) {
      setErrors(fieldErrors(e));
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  const takeDown = async (n: Notice) => {
    await api.patch(`/api/admin/notices/${n.id}`, { active: false }).catch(() => {});
    toast("success", "Announcement taken down");
    reload();
  };

  return (
    <Card>
      <CardHeader title="Announcements" subtitle="Shown at the top of every gym's VOXI" />
      <div className="space-y-4 px-5 pb-5">
        {live ? (
          <div className="flex items-start gap-3 rounded-xl border border-brand-300 bg-brand-50/60 p-3 dark:border-brand-500/40 dark:bg-brand-500/10">
            <LuMegaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-ink">{live.message}</p>
              <p className="mt-0.5 text-xs text-muted">
                Live for {live.audience === "ALL" ? "all gyms" : live.audience === "TRIAL" ? "gyms on trial" : "paying gyms"}
                {live.endsAt ? ` until ${formatDate(live.endsAt)}` : ""} · posted {timeAgo(live.createdAt)}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => takeDown(live)}>
              Take down
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">No announcement is showing right now.</p>
        )}
        <Field label="New announcement" error={errors.message} hint={`${f.message.length}/280. Posting replaces the current one.`}>
          <Textarea rows={2} maxLength={280} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="e.g. VOXI will be down for maintenance tonight from 2 to 3 am." />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Style">
            <Select value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })}>
              <option value="INFO">Info (purple)</option>
              <option value="WARNING">Warning (amber)</option>
              <option value="SUCCESS">Good news (green)</option>
            </Select>
          </Field>
          <Field label="Who sees it">
            <Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
              <option value="ALL">All gyms</option>
              <option value="TRIAL">Gyms on trial</option>
              <option value="ACTIVE">Paying gyms</option>
            </Select>
          </Field>
          <Field label="Show until" hint="Optional">
            <Input type="date" min={toDateInput()} value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
          </Field>
        </div>
        <Field label="Link" hint="Optional, e.g. /help or https://…" error={errors.link}>
          <Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="/help" />
        </Field>
        <Button onClick={post} loading={busy} disabled={f.message.trim().length < 3}>
          <LuSend className="h-4 w-4" /> Post to gyms
        </Button>
      </div>
    </Card>
  );
}

// ── Danger zone (inside Manage gym) ──────────────────────────────────────────
/** Download a gym's data, and permanently delete a suspended gym (type its name to confirm). */
export function GymDangerZone({ gym, storageBytes, onDeleted, onChanged }: { gym: AdminGym; storageBytes?: number; onDeleted: () => void; onChanged: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [switching, setSwitching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  useEffect(() => {
    setTyped("");
    setDownloaded(false);
  }, [gym.id]);

  const suspended = gym.status === "SUSPENDED";
  const matches = typed.trim().toLowerCase() === gym.name.trim().toLowerCase();

  /** Suspend: staff are signed out, devices and card links stop. Nothing is deleted. Reactivate brings it back as it was. */
  const setSuspended = async (on: boolean) => {
    const back = gym.paidUntil && new Date(gym.paidUntil) > new Date() ? "ACTIVE" : "TRIAL";
    const ok = await confirm({
      title: on ? `Suspend ${gym.name}?` : `Reactivate ${gym.name}?`,
      message: on
        ? "Its staff are signed out and can't sign in, and its devices and member card links stop working. All data is kept and you can reactivate any time."
        : `Its staff can sign in again and everything works as before (${back === "ACTIVE" ? "paid plan" : "free trial"}).`,
      confirmLabel: on ? "Suspend" : "Reactivate",
    });
    if (!ok) return;
    setSwitching(true);
    try {
      await api.put(`/api/admin/gyms/${gym.id}`, { status: on ? "SUSPENDED" : back });
      toast("success", on ? `${gym.name} is suspended` : `${gym.name} is active again`);
      onChanged();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSwitching(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/api/admin/gyms/${gym.id}`, { confirmName: typed });
      toast("success", `${gym.name} and all its data were deleted`);
      setConfirming(false);
      onDeleted();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Couldn't delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-rose-200 p-4 dark:border-rose-500/30">
      <p className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
        <LuTriangleAlert className="h-4 w-4" /> Suspend or delete
      </p>
      <p className="mt-1 text-xs text-muted">
        Uses about {storageBytes != null ? formatBytes(storageBytes) : "…"} of the database. Suspending keeps all data; deleting removes it for good.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {suspended ? (
          <Button size="sm" variant="secondary" loading={switching} onClick={() => setSuspended(false)}>
            Reactivate gym
          </Button>
        ) : (
          <Button size="sm" variant="secondary" loading={switching} className="text-rose-600" onClick={() => setSuspended(true)}>
            Suspend gym
          </Button>
        )}
        <a
          href={`/api/admin/gyms/${gym.id}/export`}
          onClick={() => setDownloaded(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink transition hover:bg-surface-2"
        >
          <LuDownload className="h-4 w-4" /> Download all data
        </a>
        <Button size="sm" variant="ghost" className="text-rose-600" disabled={!suspended} onClick={() => setConfirming(true)}>
          <LuTrash2 className="h-4 w-4" /> Delete gym permanently
        </Button>
      </div>
      {!suspended && <p className="mt-2 text-xs text-muted">A gym has to be suspended before it can be deleted.</p>}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${gym.name}?`}
        description="This permanently deletes the gym, its staff logins, members, payments, check-ins and everything else. It can't be undone."
        footer={
          <Button onClick={remove} loading={busy} disabled={!matches} className="bg-rose-600 hover:bg-rose-700">
            Delete forever
          </Button>
        }
      >
        <div className="space-y-4">
          <div className={cn("flex items-start gap-2 rounded-xl p-3 text-sm", downloaded ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300")}>
            <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {downloaded ? (
              <span>You downloaded this gym's data.</span>
            ) : (
              <span>
                Download the gym's data first, in case the owner asks for it.{" "}
                <a href={`/api/admin/gyms/${gym.id}/export`} onClick={() => setDownloaded(true)} className="font-semibold underline">
                  Download now
                </a>
              </span>
            )}
          </div>
          <Field label={`Type "${gym.name}" to confirm`}>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </Field>
          <p className="text-xs text-muted">
            {gym.members} members · {gym.staffCount} staff · {gym.branches} branch{gym.branches === 1 ? "" : "es"} <Badge tone="red">Suspended</Badge>
          </p>
        </div>
      </Modal>
    </div>
  );
}

type DeletedGymRow = { id: string; name: string; slug: string; ownerEmail: string | null; members: number; deletedBy: string | null; deletedAt: string };

/** A plain list of gyms that were deleted. No gym data is kept, only this line. */
export function DeletedGyms() {
  const { data } = useApi<{ gyms: DeletedGymRow[] }>("/api/admin/deleted");
  return (
    <Card>
      <CardHeader icon={<LuTrash2 className="h-[18px] w-[18px]" />} title="Deleted gyms" subtitle="Only the name is kept, all their data is gone" />
      {!data ? (
        <div className="p-5">
          <Skeleton className="h-24" />
        </div>
      ) : data.gyms.length === 0 ? (
        <EmptyState icon={LuTrash2} title="No deleted gyms" message="Gyms you delete permanently are listed here." />
      ) : (
        <ul className="divide-y divide-line px-5 pb-3">
          {data.gyms.map((g) => (
            <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-3 text-sm">
              <span className="font-semibold text-ink">{g.name}</span>
              <span className="text-xs text-muted">
                {g.ownerEmail ?? "no owner email"} · {g.members} member{g.members === 1 ? "" : "s"} · deleted {formatDate(g.deletedAt)}
                {g.deletedBy ? ` by ${g.deletedBy}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
