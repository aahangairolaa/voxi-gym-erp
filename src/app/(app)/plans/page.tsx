"use client";
import { useEffect, useState } from "react";
import { LuCheck, LuClipboardList, LuPencil, LuPlus, LuTrash2, LuUsers } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Skeleton, Textarea, Toggle, useConfirm, useToast } from "@/components/ui";
import { invalidate, useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { durationLabel, formatQAR } from "@/lib/format";
import type { Plan } from "@/types/api";

const COLORS = ["#7C5CFF", "#5B8DEF", "#22B8A6", "#B45CFF", "#F59E0B", "#EC4899", "#0EA5E9", "#14B8A6"];
const blank = { name: "", description: "", durationDays: 30, price: 0, sessions: "", freezeDays: 0, features: "", color: COLORS[0]!, isActive: true, sortOrder: 0 };

export default function PlansPage() {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = user.role === "OWNER" || user.role === "MANAGER";
  const { data, loading, reload } = useApi<{ plans: Plan[] }>("/api/plans");
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing === "new") setForm(blank);
    else if (editing)
      setForm({
        ...editing,
        description: editing.description ?? "",
        sessions: editing.sessions ? String(editing.sessions) : "",
        features: editing.features.join("\n"),
      });
    setError(null);
  }, [editing]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const body = {
      ...form,
      sessions: form.sessions ? Number(form.sessions) : null,
      features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
      description: form.description || null,
    };
    try {
      if (editing === "new") await api.post("/api/plans", body);
      else if (editing) await api.put(`/api/plans/${editing.id}`, body);
      invalidate("/api/plans");
      toast("success", "Plan saved");
      setEditing(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Plan) => {
    if (!(await confirm({ title: `Remove “${p.name}”?`, message: "If this plan was ever sold it will be archived (hidden from sale) instead of deleted.", danger: true, confirmLabel: "Remove" }))) return;
    const r = await api.del<{ archived?: boolean }>(`/api/plans/${p.id}`);
    invalidate("/api/plans");
    toast("success", r.archived ? "Plan archived" : "Plan deleted");
    reload();
  };

  const plans = data?.plans ?? [];

  return (
    <>
      <PageHeader
        title="Membership plans"
        subtitle="Prices are in Qatari Riyal (QAR)"
        actions={
          canEdit && (
            <Button onClick={() => setEditing("new")}>
              <LuPlus className="h-4 w-4" /> New plan
            </Button>
          )
        }
      />
      {loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>}
      {data && plans.length === 0 && <EmptyState icon={LuClipboardList} title="No plans yet" action={canEdit && <Button onClick={() => setEditing("new")}>Create your first plan</Button>} />}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} hover className={`relative flex flex-col overflow-hidden p-6 ${p.isActive ? "" : "opacity-60"}`}>
            <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full opacity-20 blur-2xl" style={{ background: p.color }} />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <span className="mb-3 block h-1.5 w-10 rounded-full" style={{ background: p.color }} />
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="text-sm text-muted">
                  {p.sessions ? `${p.sessions} sessions · ` : ""}
                  {durationLabel(p.durationDays)}
                </p>
              </div>
              {!p.isActive && <Badge>Archived</Badge>}
            </div>
            <p className="relative mt-4 font-display text-3xl font-semibold tracking-tight tabular-nums">
              <span className="mr-1 text-base font-medium text-muted">QAR</span>
              {p.price.toLocaleString("en")}
            </p>
            {p.description && <p className="relative mt-2 text-sm text-muted">{p.description}</p>}
            <ul className="relative mt-4 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-soft">
                  <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="relative mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <LuUsers className="h-4 w-4" /> {p.activeMembers} active
              </span>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label="Edit">
                    <LuPencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p)} aria-label="Delete" className="hover:text-rose-600">
                    <LuTrash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New plan" : "Edit plan"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save plan
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual" />
          </Field>
          <Field label="Price (QAR)" required>
            <Input type="number" min={0} value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Duration (days)" required hint="30 = monthly, 90 = quarterly, 365 = annual">
            <Input type="number" min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) || 1 })} />
          </Field>
          <Field label="Sessions" hint="Only for PT packs — leave empty for unlimited">
            <Input type="number" min={1} value={form.sessions} onChange={(e) => setForm({ ...form, sessions: e.target.value })} />
          </Field>
          <Field label="Freeze days allowed">
            <Input type="number" min={0} value={form.freezeDays} onChange={(e) => setForm({ ...form, freezeDays: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Features" hint="One per line" className="sm:col-span-2">
            <Textarea rows={4} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <span className="label">Colour</span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-full transition ${form.color === c ? "scale-110 ring-4 ring-[var(--ring)]" : ""}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Available for sale" />
          </div>
          {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
