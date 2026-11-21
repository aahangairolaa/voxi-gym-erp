"use client";
import { useEffect, useState } from "react";
import { LuBuilding2, LuCopy, LuPencil, LuPlus, LuTrendingUp, LuUsers } from "react-icons/lu";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, StatCard, Textarea, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { toDateInput } from "@/lib/dates";
import { formatDate, formatQAR, timeAgo } from "@/lib/format";
import type { AdminGym, AdminGymsResponse, GymStatus, SubscriptionPlan } from "@/types/api";

const PLAN_LABEL: Record<SubscriptionPlan, string> = { ESSENTIAL: "Essential", PROFESSIONAL: "Professional", ELITE: "Elite" };
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
        <StatCard label="Gyms" value={data?.stats.total ?? "–"} icon={<LuBuilding2 className="h-[18px] w-[18px]" />} hint={data ? `${data.stats.active} active · ${data.stats.trial} on trial` : undefined} />
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
                      <p className="text-sm text-ink">{g.owner?.name ?? "—"}</p>
                      <p className="text-xs text-muted">{g.owner?.email}</p>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={STATUS_TONE[g.status]} dot>
                          {STATUS_LABEL[g.status]}
                        </Badge>
                        <span className="text-xs text-muted">
                          {PLAN_LABEL[g.plan]}
                          {g.status === "TRIAL" && g.trialEndsAt && ` · ends ${formatDate(g.trialEndsAt)}`}
                        </span>
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
      <p className="mt-3 text-xs text-muted">For privacy, VOXI admins see each gym’s totals only — never its members’ details.</p>

      <CreateGymModal open={creating} onClose={() => setCreating(false)} onDone={reload} />
      <EditGymModal gym={editing} onClose={() => setEditing(null)} onDone={reload} />
    </>
  );
}

const blank = {
  name: "", phone: "", email: "", address: "", branchName: "Main branch",
  plan: "PROFESSIONAL" as SubscriptionPlan, status: "TRIAL" as GymStatus, trialDays: 14,
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
      const r = await api.post<{ name: string; ownerEmail: string }>("/api/admin/gyms", { ...form, trialDays: Number(form.trialDays) });
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
      title={created ? "Gym created 🎉" : "New gym"}
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
              <Input value={form.phone} onChange={set("phone")} inputMode="tel" />
            </Field>
            <Field label="Gym email">
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={form.address} onChange={set("address")} placeholder="Lusail Marina, Doha" />
            </Field>
          </section>
          <section className="grid gap-4 sm:grid-cols-3">
            <Field label="VOXI plan">
              <Select value={form.plan} onChange={set("plan")}>
                {Object.entries(PLAN_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
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
  const [form, setForm] = useState({ plan: "PROFESSIONAL" as SubscriptionPlan, status: "TRIAL" as GymStatus, trialEndsAt: "", platformNotes: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (gym)
      setForm({ plan: gym.plan, status: gym.status, trialEndsAt: gym.trialEndsAt ? toDateInput(new Date(gym.trialEndsAt)) : "", platformNotes: gym.platformNotes ?? "" });
  }, [gym]);

  const save = async () => {
    if (!gym) return;
    setBusy(true);
    try {
      await api.put(`/api/admin/gyms/${gym.id}`, { ...form, trialEndsAt: form.trialEndsAt || null, platformNotes: form.platformNotes || null });
      toast("success", `${gym.name} updated`);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="VOXI plan">
          <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as SubscriptionPlan })}>
            {Object.entries(PLAN_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GymStatus })}>
            <option value="TRIAL">Free trial</option>
            <option value="ACTIVE">Active (paying)</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </Field>
        {form.status === "TRIAL" && (
          <Field label="Trial ends" className="sm:col-span-2">
            <Input type="date" value={form.trialEndsAt} onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })} />
          </Field>
        )}
        <Field label="Internal notes" className="sm:col-span-2" hint="Only the VOXI team sees this">
          <Textarea rows={3} value={form.platformNotes} onChange={(e) => setForm({ ...form, platformNotes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
