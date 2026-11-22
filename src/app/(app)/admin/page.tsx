"use client";
import { PhoneInput } from "@/components/ui/phone-input";
import { useEffect, useState } from "react";
import { LuBuilding2, LuCopy, LuPencil, LuPlus, LuTicket, LuTrendingUp, LuUsers } from "react-icons/lu";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, StatCard, Textarea, Toggle, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { api, fieldErrors } from "@/lib/api-client";
import { toDateInput } from "@/lib/dates";
import { formatDate, formatQAR, timeAgo } from "@/lib/format";
import { MAX_EXTRA_BRANCHES, TERMS, quote, qar, termFor } from "@/lib/pricing";
import type { AdminGym, AdminGymsResponse, GymStatus } from "@/types/api";

const planText = (months: number, extra: number) => `${termFor(months).label}${extra ? ` + ${extra} branch${extra === 1 ? "" : "es"}` : ""}`;
const STATUS_TONE: Record<GymStatus, "green" | "amber" | "red"> = { ACTIVE: "green", TRIAL: "amber", SUSPENDED: "red" };
const STATUS_LABEL: Record<GymStatus, string> = { ACTIVE: "Active", TRIAL: "Trial", SUSPENDED: "Suspended" };

/** VOXI platform admin: every gym using VOXI, its plan, status and activity. */
export default function AdminPage() {
  const { data, error, loading, reload } = useApi<AdminGymsResponse>("/api/admin/gyms");
  const [filter, setFilter] = useState<"ALL" | GymStatus>("ALL");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminGym | null>(null);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  const gyms = (data?.gyms ?? []).filter((g) => filter === "ALL" || g.status === filter);

  return (
    <>
      <PageHeader
        title="Gyms on VOXI"
        subtitle="Create gyms, manage subscriptions and see how each one uses VOXI"
        actions={
          <Button onClick={() => setCreating(true)}>
            <LuPlus className="h-4 w-4" /> New gym
          </Button>
        }
      />

      <div className="stagger mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard accent label="Monthly recurring revenue" value={data ? formatQAR(data.stats.mrr) : "–"} icon={<LuTrendingUp className="h-[18px] w-[18px]" />} hint="Active subscriptions" />
        <StatCard label="Gyms" value={data?.stats.total ?? "–"} icon={<LuBuilding2 className="h-[18px] w-[18px]" />} hint={data ? `${data.stats.active} active · ${data.stats.trial} on trial${data.stats.requests ? ` · ${data.stats.requests} plan request${data.stats.requests === 1 ? "" : "s"}` : ""}` : undefined} />
        <StatCard label="Members across all gyms" value={data?.stats.members.toLocaleString("en") ?? "–"} icon={<LuUsers className="h-[18px] w-[18px]" />} />
        <StatCard label="Suspended" value={data?.stats.suspended ?? "–"} icon={<LuBuilding2 className="h-[18px] w-[18px]" />} />
      </div>

      <div className="mb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All" },
            { value: "ACTIVE", label: "Active" },
            { value: "TRIAL", label: "Trial" },
            { value: "SUSPENDED", label: "Suspended" },
          ]}
        />
      </div>

      <Card>
        {loading && <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>}
        {data && gyms.length === 0 && <EmptyState icon={LuBuilding2} title="No gyms here" />}
        {gyms.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table min-w-[860px]">
              <thead>
                <tr>
                  <th>Gym</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th className="text-right">Members</th>
                  <th className="text-right">Revenue (30d)</th>
                  <th>Last active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {gyms.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {g.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.logo} alt="" className="h-9 w-9 rounded-xl border border-line object-contain" />
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: g.brandColor ?? "#6a44f2" }}>
                            {g.name.slice(0, 1)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{g.name}</p>
                          <p className="font-mono text-[11px] text-muted">
                            {g.slug} · {g.branches} branch{g.branches === 1 ? "" : "es"} · {g.staffCount} staff
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-ink">{g.owner?.name ?? "–"}</p>
                      <p className="text-xs text-muted">{g.owner?.email}</p>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={STATUS_TONE[g.status]} dot>
                          {STATUS_LABEL[g.status]}
                        </Badge>
                        <span className="text-xs text-muted">
                          {g.status === "ACTIVE" ? `${planText(g.billingMonths, g.extraBranches)}${g.cafeEnabled ? " + Café" : ""}` : g.status === "TRIAL" && g.trialEndsAt ? `ends ${formatDate(g.trialEndsAt)}` : ""}
                          {g.status === "ACTIVE" && g.paidUntil && ` · until ${formatDate(g.paidUntil)}`}
                        </span>
                        {g.planRequest && <Badge tone="brand">Requested {planText(g.planRequest.months, g.planRequest.extraBranches)}</Badge>}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">
                      {g.members}
                      <p className="text-xs text-muted">{g.activeMemberships} active</p>
                    </td>
                    <td className="text-right font-semibold tabular-nums">{formatQAR(g.revenue30d)}</td>
                    <td className="text-sm text-ink-soft">{g.lastActiveAt ? timeAgo(g.lastActiveAt) : "Never"}</td>
                    <td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(g)}>
                        <LuPencil className="h-3.5 w-3.5" /> Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">For privacy, VOXI admins see each gym’s totals only, never its members’ details.</p>

      <PromoCodes />

      <CreateGymModal open={creating} onClose={() => setCreating(false)} onDone={reload} />
      <EditGymModal gym={editing} onClose={() => setEditing(null)} onDone={reload} />
    </>
  );
}

const blank = {
  name: "", phone: "", email: "", address: "", branchName: "Main branch",
  billingMonths: "12", extraBranches: "0", status: "TRIAL" as GymStatus, trialDays: 7,
  ownerName: "", ownerEmail: "", ownerPassword: "",
};

function randomPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => chars[n % chars.length]).join("");
}

function CreateGymModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; ownerEmail: string; password: string } | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...blank, ownerPassword: randomPassword() });
      setCreated(null);
    }
  }, [open]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ name: string; ownerEmail: string }>("/api/admin/gyms", { ...form, trialDays: Number(form.trialDays), billingMonths: Number(form.billingMonths), extraBranches: Number(form.extraBranches) });
      setCreated({ name: r.name, ownerEmail: r.ownerEmail, password: form.ownerPassword });
      onDone();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const loginText = created ? `VOXI login for ${created.name}\n${typeof window !== "undefined" ? window.location.origin : ""}/login\nEmail: ${created.ownerEmail}\nPassword: ${created.password}` : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={created ? "Gym created" : "New gym"}
      description={created ? "Send these login details to the owner. They should change the password after signing in." : "Creates the gym, its owner account, a first branch, starter plans and an exercise library."}
      footer={
        created ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(loginText).catch(() => {});
                toast("success", "Copied");
              }}
            >
              <LuCopy className="h-4 w-4" /> Copy login details
            </Button>
            <Button onClick={onClose}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy} disabled={!form.name || !form.ownerName || !form.ownerEmail || form.ownerPassword.length < 8}>
              Create gym
            </Button>
          </>
        )
      }
    >
      {created ? (
        <pre className="rounded-2xl bg-surface-2 p-4 font-mono text-sm whitespace-pre-wrap text-ink">{loginText}</pre>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Gym name" required>
              <Input value={form.name} onChange={set("name")} placeholder="Pulse Ladies Studio" autoFocus />
            </Field>
            <Field label="First branch">
              <Input value={form.branchName} onChange={set("branchName")} />
            </Field>
            <Field label="Phone">
              <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </Field>
            <Field label="Gym email">
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={form.address} onChange={set("address")} placeholder="Lusail Marina, Doha" />
            </Field>
          </section>
          <section className="grid gap-4 sm:grid-cols-3">
            <Field label="Billing term">
              <Select value={form.billingMonths} onChange={set("billingMonths")}>
                {TERMS.map((t) => (
                  <option key={t.months} value={t.months}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Extra branches">
              <Select value={form.extraBranches} onChange={set("extraBranches")}>
                {Array.from({ length: MAX_EXTRA_BRANCHES + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set("status")}>
                <option value="TRIAL">Free trial</option>
                <option value="ACTIVE">Active (paying)</option>
              </Select>
            </Field>
            {form.status === "TRIAL" && (
              <Field label="Trial days">
                <Input type="number" min={1} max={90} value={form.trialDays} onChange={set("trialDays")} />
              </Field>
            )}
          </section>
          <section className="grid gap-4 sm:grid-cols-3">
            <Field label="Owner name" required>
              <Input value={form.ownerName} onChange={set("ownerName")} />
            </Field>
            <Field label="Owner email (login)" required>
              <Input type="email" value={form.ownerEmail} onChange={set("ownerEmail")} />
            </Field>
            <Field label="Temporary password" hint="At least 8 characters">
              <Input value={form.ownerPassword} onChange={set("ownerPassword")} className="font-mono" />
            </Field>
          </section>
        </div>
      )}
    </Modal>
  );
}

function EditGymModal({ gym, onClose, onDone }: { gym: AdminGym | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ status: "TRIAL" as GymStatus, trialEndsAt: "", billingMonths: "12", extraBranches: "0", cafeEnabled: false, paidUntil: "", platformNotes: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (gym)
      setForm({
        cafeEnabled: gym.cafeEnabled,
        status: gym.status,
        trialEndsAt: gym.trialEndsAt ? toDateInput(new Date(gym.trialEndsAt)) : "",
        billingMonths: String(gym.billingMonths),
        extraBranches: String(gym.extraBranches),
        paidUntil: gym.paidUntil ? toDateInput(new Date(gym.paidUntil)) : "",
        platformNotes: gym.platformNotes ?? "",
      });
  }, [gym]);

  const send = async (body: object, msg: string) => {
    if (!gym) return;
    setBusy(true);
    try {
      await api.put(`/api/admin/gyms/${gym.id}`, body);
      toast("success", msg);
      onDone();
      onClose();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    send(
      {
        status: form.status,
        trialEndsAt: form.trialEndsAt || null,
        billingMonths: Number(form.billingMonths),
        extraBranches: Number(form.extraBranches),
        cafeEnabled: form.cafeEnabled,
        paidUntil: form.paidUntil || null,
        platformNotes: form.platformNotes || null,
      },
      `${gym?.name} updated`,
    );

  const q = quote(Number(form.billingMonths), Number(form.extraBranches), form.cafeEnabled);
  const req = gym?.planRequest;

  return (
    <Modal
      open={!!gym}
      onClose={onClose}
      title={gym ? `Manage ${gym.name}` : ""}
      description="Suspending a gym signs its staff out of VOXI and stops its devices and card links. Nothing is deleted."
      footer={
        <Button onClick={save} loading={busy}>
          Save
        </Button>
      }
    >
      {req && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-300 bg-brand-50/60 p-4 dark:border-brand-500/40 dark:bg-brand-500/10">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-ink">
              Requested {planText(req.months, req.extraBranches)}
              {req.cafe ? " + VOXI Café" : ""}, {qar(req.total)}
            </p>
            {!!req.oneTime && (
              <p className="text-ink-soft">
                One-time: {req.entrances ? `${req.entrances} biometric entrance${req.entrances === 1 ? "" : "s"}` : ""}
                {req.entrances && req.onboarding ? " + " : ""}
                {req.onboarding ? "onboarding" : ""} ({qar(req.oneTime)})
              </p>
            )}
            {req.promoCode && (
              <p className="text-emerald-700 dark:text-emerald-400">
                Promo {req.promoCode}: −{qar(req.promoDiscount ?? 0)}
              </p>
            )}
            {req.totalToday != null && <p className="font-semibold text-ink">Invoice now: {qar(req.totalToday)}</p>}
            <p className="text-muted">
              By {req.requestedBy} on {formatDate(req.requestedAt)}. Activate once the invoice is paid.
            </p>
          </div>
          <Button size="sm" loading={busy} onClick={() => send({ applyRequest: true }, `${gym?.name} is now active`)}>
            Activate request
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GymStatus })}>
            <option value="TRIAL">Free trial</option>
            <option value="ACTIVE">Active (paying)</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </Field>
        {form.status === "TRIAL" ? (
          <Field label="Trial ends">
            <Input type="date" value={form.trialEndsAt} onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })} />
          </Field>
        ) : (
          <Field label="Paid until">
            <Input type="date" value={form.paidUntil} onChange={(e) => setForm({ ...form, paidUntil: e.target.value })} />
          </Field>
        )}
        <Field label="Billing term">
          <Select value={form.billingMonths} onChange={(e) => setForm({ ...form, billingMonths: e.target.value })}>
            {TERMS.map((t) => (
              <option key={t.months} value={t.months}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Extra branches" hint={`${qar(q.total)} per term`}>
          <Select value={form.extraBranches} onChange={(e) => setForm({ ...form, extraBranches: e.target.value })}>
            {Array.from({ length: MAX_EXTRA_BRANCHES + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2 rounded-xl border border-line p-3">
          <Toggle checked={form.cafeEnabled} onChange={(v) => setForm({ ...form, cafeEnabled: v })} label="VOXI Café unlocked (menu, café sales and team)" />
        </div>
        <Field label="Internal notes" className="sm:col-span-2" hint="Only the VOXI team sees this">
          <Textarea rows={3} value={form.platformNotes} onChange={(e) => setForm({ ...form, platformNotes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

type PromoRow = {
  id: string; code: string; kind: "PERCENT" | "AMOUNT"; value: number; appliesTo: "ALL" | "SUBSCRIPTION" | "ONE_TIME";
  minMonths: number | null; expiresAt: string | null; maxUses: number | null; uses: number; active: boolean; note: string | null; label: string;
};

/** Promo codes gyms can enter on their Billing page. */
function PromoCodes() {
  const { data, reload } = useApi<{ promos: PromoRow[] }>("/api/admin/promos");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const promos = data?.promos ?? [];

  const toggle = async (p: PromoRow) => {
    try {
      await api.patch(`/api/admin/promos/${p.id}`, { active: !p.active });
      toast("success", `${p.code} ${p.active ? "switched off" : "switched on"}`);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const status = (p: PromoRow) => {
    if (!p.active) return <Badge tone="gray">Off</Badge>;
    if (p.expiresAt && new Date(p.expiresAt).getTime() < Date.now()) return <Badge tone="red">Expired</Badge>;
    if (p.maxUses != null && p.uses >= p.maxUses) return <Badge tone="amber">Used up</Badge>;
    return <Badge tone="green">Live</Badge>;
  };

  return (
    <div className="mt-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Promo codes</h2>
          <p className="text-sm text-muted">Gyms enter these on their Billing page. A code takes money off the first invoice only.</p>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <LuTicket className="h-4 w-4" /> New promo code
        </Button>
      </div>
      <Card>
        {promos.length === 0 ? (
          <EmptyState icon={LuTicket} title="No promo codes yet" message="Create one, e.g. LAUNCH20 for 20% off the first invoice." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Rules</th>
                  <th className="px-4 py-3 font-medium">Used</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono font-semibold tracking-wide text-ink">{p.code}</td>
                    <td className="px-4 py-3 text-ink-soft">{p.label}</td>
                    <td className="px-4 py-3 text-muted">
                      {[p.minMonths ? `${termFor(p.minMonths).name} or longer` : "Any plan", p.expiresAt ? `until ${formatDate(p.expiresAt)}` : null, p.note]
                        .filter(Boolean)
                        .join(" · ")}
                    </td>
                    <td className="px-4 py-3 text-ink-soft tabular-nums">
                      {p.uses}
                      {p.maxUses != null ? ` / ${p.maxUses}` : ""}
                    </td>
                    <td className="px-4 py-3">{status(p)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => toggle(p)}>
                        {p.active ? "Switch off" : "Switch on"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <NewPromoModal open={open} onClose={() => setOpen(false)} onDone={reload} />
    </div>
  );
}

function NewPromoModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const empty = { code: "", kind: "PERCENT" as "PERCENT" | "AMOUNT", value: "", appliesTo: "ALL", minMonths: "", expiresAt: "", maxUses: "", note: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setF(empty);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.post("/api/admin/promos", {
        code: f.code,
        kind: f.kind,
        value: f.value,
        appliesTo: f.appliesTo,
        minMonths: f.minMonths || null,
        expiresAt: f.expiresAt || null,
        maxUses: f.maxUses || null,
        note: f.note || null,
      });
      toast("success", `${f.code.toUpperCase()} created`);
      onDone();
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New promo code"
      description="Gyms type the code on their Billing page. It takes money off their first invoice."
      footer={
        <Button onClick={save} loading={busy}>
          Create code
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" required hint="Letters and numbers, e.g. LAUNCH20" error={errors.code}>
          <Input value={f.code} maxLength={30} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") })} className="font-mono tracking-wide" />
        </Field>
        <Field label="Discount" required error={errors.value}>
          <div className="flex gap-2">
            <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "PERCENT" | "AMOUNT" })} className="w-28">
              <option value="PERCENT">%</option>
              <option value="AMOUNT">QAR</option>
            </Select>
            <Input type="number" min={1} max={f.kind === "PERCENT" ? 100 : undefined} inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder={f.kind === "PERCENT" ? "20" : "2000"} />
          </div>
        </Field>
        <Field label="Takes money off">
          <Select value={f.appliesTo} onChange={(e) => setF({ ...f, appliesTo: e.target.value })}>
            <option value="ALL">The whole first invoice</option>
            <option value="SUBSCRIPTION">The subscription only</option>
            <option value="ONE_TIME">One-time services only</option>
          </Select>
        </Field>
        <Field label="Valid for">
          <Select value={f.minMonths} onChange={(e) => setF({ ...f, minMonths: e.target.value })}>
            <option value="">Any plan</option>
            <option value="6">6 months or longer</option>
            <option value="12">Annual only</option>
          </Select>
        </Field>
        <Field label="Expires on" hint="Optional" error={errors.expiresAt}>
          <Input type="date" value={f.expiresAt} min={toDateInput(new Date())} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} />
        </Field>
        <Field label="Maximum gyms" hint="Optional. Empty means no limit" error={errors.maxUses}>
          <Input type="number" min={1} inputMode="numeric" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} />
        </Field>
        <Field label="Note" hint="Only VOXI admins see this" className="sm:col-span-2">
          <Input value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Launch offer for gyms met at the expo" />
        </Field>
      </div>
    </Modal>
  );
}
