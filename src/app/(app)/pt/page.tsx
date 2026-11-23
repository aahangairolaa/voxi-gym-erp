"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuCalendarCheck, LuCheck, LuCrown, LuDumbbell, LuPlus, LuTrendingUp, LuUndo2, LuUserPlus, LuUsers } from "react-icons/lu";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, StatCard, Textarea, useConfirm, useToast } from "@/components/ui";
import { MemberFormModal } from "@/components/members/member-form-modal";
import { MemberPicker } from "@/components/members/member-picker";
import { PaymentMethodPicker } from "@/components/members/payment-fields";
import { SoldBySelect } from "@/components/sales/sold-by-fields";
import { invalidate, useApi } from "@/hooks/use-api";
import { api, fieldErrors } from "@/lib/api-client";
import { toDateInput } from "@/lib/dates";
import { formatDate, formatQAR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/api";

type Pkg = {
  id: string; name: string; sessionsTotal: number; sessionsUsed: number; sessionsLeft: number; status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  expiresAt: string | null; createdAt: string; notes: string | null; price: number | null; paid: number | null; lastSessionAt: string | null;
  member: { id: string; name: string; code: string; ptOnly: boolean; photoUrl: string | null };
  trainer: { id: string; name: string } | null; soldBy: string | null;
};
type PtData = {
  canSell: boolean; canManage: boolean; isTrainer: boolean; me: string; showMoney: boolean;
  stats: { sessionsToday: number; sessionsThisMonth: number; activeClients: number; revenueThisMonth: number | null };
  packages: Pkg[];
  recent: { id: string; doneAt: string; notes: string | null; member: { id: string; name: string }; trainer: { id: string; name: string } | null; package: { id: string; name: string; sessionsUsed: number; sessionsTotal: number }; canUndo: boolean }[];
  trainers: { id: string; name: string; role: string }[];
  board: { trainerId: string; name: string; sessions: number; clients: number; revenue: number | null }[];
};

export default function PtPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState<"ACTIVE" | "COMPLETED" | "all">("ACTIVE");
  const [trainerId, setTrainerId] = useState("");
  const { data, loading, reload } = useApi<PtData>(`/api/pt?status=${status}${trainerId ? `&trainerId=${trainerId}` : ""}`);
  const [selling, setSelling] = useState(false);
  const [logging, setLogging] = useState<Pkg | null>(null);
  const [moving, setMoving] = useState<Pkg | null>(null);

  const undo = async (id: string) => {
    if (!(await confirm({ title: "Undo this session?", message: "It goes back on the client's package.", confirmLabel: "Undo" }))) return;
    try {
      await api.del(`/api/pt/sessions/${id}`);
      toast("success", "Session undone");
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const cancel = async (p: Pkg) => {
    if (!(await confirm({ title: `Cancel ${p.member.name}'s package?`, message: `${p.sessionsLeft} unused session${p.sessionsLeft === 1 ? "" : "s"} will be cancelled. Payments are not refunded automatically.`, confirmLabel: "Cancel package", danger: true }))) return;
    try {
      await api.patch(`/api/pt/packages/${p.id}`, { action: "cancel" });
      toast("success", "Package cancelled");
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const d = data;
  return (
    <>
      <PageHeader
        title="Personal Training"
        subtitle={d?.isTrainer ? "Your PT clients. Tap Session done after every session." : "PT clients, sessions and your trainers' leaderboard"}
        actions={
          d?.canSell && (
            <Button onClick={() => setSelling(true)}>
              <LuPlus className="h-4 w-4" /> Sell PT package
            </Button>
          )
        }
      />

      {loading && !d ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : d ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard accent label="Sessions today" value={String(d.stats.sessionsToday)} icon={<LuCalendarCheck className="h-4 w-4" />} />
            <StatCard label="Sessions this month" value={String(d.stats.sessionsThisMonth)} icon={<LuDumbbell className="h-4 w-4" />} />
            <StatCard label={d.isTrainer ? "My active clients" : "Active PT clients"} value={String(d.stats.activeClients)} icon={<LuUsers className="h-4 w-4" />} />
            {d.stats.revenueThisMonth !== null ? (
              <StatCard label="PT sales this month" value={formatQAR(d.stats.revenueThisMonth)} icon={<LuTrendingUp className="h-4 w-4" />} />
            ) : (
              <StatCard label="Packages shown" value={String(d.packages.length)} icon={<LuTrendingUp className="h-4 w-4" />} />
            )}
          </div>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Segmented
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "ACTIVE" as const, label: "Active" },
                    { value: "COMPLETED" as const, label: "Completed" },
                    { value: "all" as const, label: "All" },
                  ]}
                />
                {!d.isTrainer && (
                  <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="w-48">
                    <option value="">All trainers</option>
                    {d.trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              {d.packages.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={LuDumbbell}
                    title={d.isTrainer ? "No PT clients yet" : "No PT packages here"}
                    message={d.isTrainer ? "When reception sells a PT package with you as the trainer, the client appears here." : "Sell a package to a member or a new PT-only client."}
                    action={d.canSell ? <Button onClick={() => setSelling(true)}><LuPlus className="h-4 w-4" /> Sell PT package</Button> : undefined}
                  />
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {d.packages.map((p) => {
                    const pct = Math.min(100, (p.sessionsUsed / p.sessionsTotal) * 100);
                    const low = p.status === "ACTIVE" && p.sessionsLeft <= 2;
                    return (
                      <Card key={p.id} className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar name={p.member.name} src={p.member.photoUrl} size={44} />
                          <div className="min-w-0 flex-1">
                            <Link href={`/members/${p.member.id}`} className="block truncate font-semibold text-ink hover:underline">
                              {p.member.name}
                            </Link>
                            <p className="text-xs text-muted">
                              {p.member.code}
                              {p.trainer && !d.isTrainer ? ` · with ${p.trainer.name}` : ""}
                            </p>
                          </div>
                          {p.member.ptOnly && <Badge tone="green">PT only</Badge>}
                          {p.status !== "ACTIVE" && <Badge tone="gray">{p.status === "COMPLETED" ? "Completed" : "Cancelled"}</Badge>}
                        </div>

                        <div className="mt-4">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="font-medium text-ink-soft">{p.name}</span>
                            <span className={cn("font-semibold tabular-nums", low ? "text-amber-600 dark:text-amber-400" : "text-ink")}>
                              {p.sessionsUsed}/{p.sessionsTotal}
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full rounded-full brand-gradient transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1.5 text-xs text-muted">
                            {p.status === "ACTIVE" ? `${p.sessionsLeft} session${p.sessionsLeft === 1 ? "" : "s"} left` : `Started ${formatDate(p.createdAt)}`}
                            {p.lastSessionAt ? ` · last ${timeAgo(p.lastSessionAt)}` : " · no sessions yet"}
                            {p.expiresAt ? ` · expires ${formatDate(p.expiresAt)}` : ""}
                          </p>
                          {p.price !== null && (
                            <p className="mt-0.5 text-xs text-muted">
                              {formatQAR(p.price)}
                              {p.paid !== null && p.paid < p.price ? ` · ${formatQAR(p.price - p.paid)} unpaid` : ""}
                              {p.soldBy ? ` · sold by ${p.soldBy}` : ""}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {p.status === "ACTIVE" && (
                            <Button size="sm" onClick={() => setLogging(p)} className="flex-1">
                              <LuCheck className="h-4 w-4" /> Session done
                            </Button>
                          )}
                          {d.canManage && p.status === "ACTIVE" && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => setMoving(p)}>
                                Trainer
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => cancel(p)} className="text-rose-600">
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader title="Trainer leaderboard" subtitle="This month" />
                {d.board.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">Add trainers on the Staff page.</p>
                ) : (
                  <ol className="space-y-3 px-5 pb-5">
                    {d.board.map((b, i) => (
                      <li key={b.trainerId} className={cn("flex items-center gap-3 rounded-xl p-2", b.trainerId === d.me && "bg-brand-50/70 dark:bg-brand-500/10")}>
                        <span className={cn("w-5 text-center text-sm font-bold tabular-nums", i === 0 ? "text-amber-500" : "text-muted")}>{i === 0 && b.sessions > 0 ? <LuCrown className="mx-auto h-4 w-4" /> : i + 1}</span>
                        <Avatar name={b.name} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{b.name}</p>
                          <p className="text-xs text-muted">
                            {b.clients} client{b.clients === 1 ? "" : "s"}
                            {b.revenue !== null ? ` · ${formatQAR(b.revenue)}` : ""}
                          </p>
                        </div>
                        <span className="text-right">
                          <span className="block text-lg leading-none font-semibold text-ink tabular-nums">{b.sessions}</span>
                          <span className="text-[10px] text-muted uppercase">sessions</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card>
                <CardHeader title="Recent sessions" />
                {d.recent.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">Sessions you log appear here.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {d.recent.map((r) => (
                      <li key={r.id} className="group flex items-start gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{r.member.name}</p>
                          <p className="text-xs text-muted">
                            {timeAgo(r.doneAt)}
                            {r.trainer && !d.isTrainer ? ` · ${r.trainer.name}` : ""} · {r.package.name}
                          </p>
                          {r.notes && <p className="mt-1 text-xs text-ink-soft">{r.notes}</p>}
                        </div>
                        {r.canUndo && (
                          <button type="button" onClick={() => undo(r.id)} aria-label="Undo session" className="rounded-md p-1 text-muted opacity-0 transition group-hover:opacity-100 hover:text-ink focus:opacity-100">
                            <LuUndo2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      ) : null}

      <LogSessionModal pkg={logging} onClose={() => setLogging(null)} onDone={() => { setLogging(null); reload(); }} />
      {d && <SellPtModal open={selling} trainers={d.trainers} onClose={() => setSelling(false)} onDone={() => { setSelling(false); reload(); }} />}
      {d && <MoveModal pkg={moving} trainers={d.trainers} onClose={() => setMoving(null)} onDone={() => { setMoving(null); reload(); }} />}
    </>
  );
}

function LogSessionModal({ pkg, onClose, onDone }: { pkg: Pkg | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (pkg) {
      setNotes("");
      setDate(toDateInput());
    }
  }, [pkg]);

  const save = async () => {
    if (!pkg) return;
    setBusy(true);
    try {
      const today = date === toDateInput();
      const r = await api.post<{ sessionsUsed: number; sessionsTotal: number; completed: boolean }>("/api/pt/sessions", {
        packageId: pkg.id,
        notes: notes || null,
        doneAt: today ? null : date,
      });
      toast("success", r.completed ? `${pkg.member.name} finished all ${r.sessionsTotal} sessions` : `Session ${r.sessionsUsed} of ${r.sessionsTotal} done`);
      onDone();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!pkg}
      onClose={onClose}
      title={pkg ? `Session with ${pkg.member.name}` : ""}
      description={pkg ? `${pkg.name}: this will be session ${pkg.sessionsUsed + 1} of ${pkg.sessionsTotal}.` : undefined}
      footer={
        <Button onClick={save} loading={busy}>
          <LuCheck className="h-4 w-4" /> Mark session done
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="What did you train?" hint="Optional, e.g. Legs: squats 5×5, RDL 4×8">
          <Textarea rows={3} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} autoFocus />
        </Field>
        <Field label="Date" hint="Change it only if you're logging a past session">
          <Input type="date" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value || toDateInput())} />
        </Field>
      </div>
    </Modal>
  );
}

function SellPtModal({ open, trainers, onClose, onDone }: { open: boolean; trainers: PtData["trainers"]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [member, setMember] = useState<SearchResult | null>(null);
  const [trainerId, setTrainerId] = useState("");
  const [sessions, setSessions] = useState("10");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState<string | null>(null);
  const [method, setMethod] = useState("CARD");
  const [soldById, setSoldById] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newClient, setNewClient] = useState(false);

  useEffect(() => {
    if (open) {
      setMember(null);
      setTrainerId(trainers.length === 1 ? trainers[0]!.id : "");
      setSessions("10");
      setPrice("");
      setPaid(null);
      setMethod("CARD");
      setSoldById("");
      setExpires("");
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const priceN = Number(price) || 0;
  const paying = paid === null ? priceN : Math.min(Number(paid) || 0, priceN);

  const save = async () => {
    if (!member) return toast("error", "Choose the client");
    setBusy(true);
    setErrors({});
    try {
      await api.post("/api/pt/packages", {
        memberId: member.id,
        trainerId,
        sessionsTotal: sessions,
        price: priceN,
        amountPaid: paying,
        paymentMethod: method,
        soldById: soldById || null,
        expiresAt: expires || null,
      });
      invalidate("/api/");
      toast("success", `${sessions} PT sessions sold to ${member.name}`);
      onDone();
    } catch (e) {
      setErrors(fieldErrors(e));
      toast("error", e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={open && !newClient}
        onClose={onClose}
        title="Sell a PT package"
        description="Sessions with a trainer. Works for members and for PT-only clients."
        footer={
          <Button onClick={save} loading={busy}>
            Sell package {priceN ? formatQAR(priceN) : ""}
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Client" required>
            <MemberPicker value={member} onChange={setMember} />
          </Field>
          <button type="button" onClick={() => setNewClient(true)} className="-mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
            <LuUserPlus className="h-3.5 w-3.5" /> New client (PT only, no membership)
          </button>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trainer" required error={errors.trainerId}>
              <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
                <option value="">Choose</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sessions" required error={errors.sessionsTotal}>
              <Input type="number" inputMode="numeric" min={1} max={500} value={sessions} onChange={(e) => setSessions(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Package price (QAR)" required error={errors.price}>
              <Input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Paid now (QAR)" hint={paying < priceN ? `${formatQAR(priceN - paying)} left to pay` : undefined} error={errors.amountPaid}>
              <Input type="number" inputMode="numeric" min={0} value={paid ?? price} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Use sessions by" hint="Optional expiry date">
              <Input type="date" min={toDateInput()} value={expires} onChange={(e) => setExpires(e.target.value)} />
            </Field>
            <SoldBySelect value={soldById} onChange={setSoldById} hint="Optional" />
          </div>
          {paying > 0 && (
            <div>
              <span className="label">Payment method</span>
              <PaymentMethodPicker value={method} onChange={setMethod} />
            </div>
          )}
        </div>
      </Modal>
      <MemberFormModal
        open={open && newClient}
        onClose={() => setNewClient(false)}
        presetPtOnly
        onSaved={async (id) => {
          setNewClient(false);
          try {
            const m = await api.get<{ id: string; code: string; name: string; phone: string; status: SearchResult["status"]; photoUrl: string | null }>(`/api/members/${id}`);
            setMember({ id: m.id, code: m.code, name: m.name, phone: m.phone, status: m.status, plan: null, photoUrl: m.photoUrl });
          } catch {}
        }}
      />
    </>
  );
}

function MoveModal({ pkg, trainers, onClose, onDone }: { pkg: Pkg | null; trainers: PtData["trainers"]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [trainerId, setTrainerId] = useState("");
  useEffect(() => setTrainerId(pkg?.trainer?.id ?? ""), [pkg]);
  const save = async () => {
    if (!pkg) return;
    try {
      await api.patch(`/api/pt/packages/${pkg.id}`, { action: "reassign", trainerId });
      toast("success", "Trainer changed");
      onDone();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };
  return (
    <Modal open={!!pkg} onClose={onClose} title="Change trainer" description={pkg ? `${pkg.member.name}, ${pkg.name}` : undefined} footer={<Button onClick={save}>Save</Button>}>
      <Field label="Trainer">
        <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}
