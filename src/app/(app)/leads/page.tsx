"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LuPhone, LuPlus, LuUserCheck, LuTrash2, LuMessageCircle, LuCalendar } from "react-icons/lu";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea, useConfirm, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { formatShortDate, humanize, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/api";

const COLUMN_TONE: Record<Lead["status"], string> = {
  NEW: "bg-brand-500",
  CONTACTED: "bg-sky-500",
  TRIAL: "bg-amber-500",
  CONVERTED: "bg-emerald-500",
  LOST: "bg-slate-400",
};
const blank = { name: "", phone: "+974 ", email: "", source: "WALK_IN", status: "NEW", interest: "", notes: "", followUpAt: "" };

/** Simple sales pipeline: drag-free — use the status menu on each card. */
export default function LeadsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const { data, loading, reload, setData } = useApi<{ leads: Lead[] }>("/api/leads");
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing === "new") setForm(blank);
    else if (editing)
      setForm({
        name: editing.name, phone: editing.phone, email: editing.email ?? "", source: editing.source, status: editing.status,
        interest: editing.interest ?? "", notes: editing.notes ?? "", followUpAt: editing.followUpAt ? toDateInput(new Date(editing.followUpAt)) : "",
      });
  }, [editing]);

  const leads = data?.leads ?? [];

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, email: form.email || null, interest: form.interest || null, notes: form.notes || null, followUpAt: form.followUpAt || null };
      if (editing === "new") await api.post("/api/leads", body);
      else if (editing) await api.put(`/api/leads/${editing.id}`, body);
      toast("success", "Lead saved");
      setEditing(null);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const move = async (lead: Lead, status: Lead["status"]) => {
    setData({ leads: leads.map((l) => (l.id === lead.id ? { ...l, status } : l)) }); // instant UI
    await api.patch(`/api/leads/${lead.id}`, { status }).catch(() => reload());
  };

  const convert = async (lead: Lead) => {
    if (!(await confirm({ title: `Convert ${lead.name} to a member?`, message: "A member profile is created from this lead. You can then sell them a plan.", confirmLabel: "Create member" }))) return;
    try {
      const m = await api.post<{ id: string }>(`/api/leads/${lead.id}/convert`);
      toast("success", "Member created");
      router.push(`/members/${m.id}`);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (lead: Lead) => {
    if (!(await confirm({ title: `Delete lead ${lead.name}?`, danger: true, confirmLabel: "Delete" }))) return;
    await api.del(`/api/leads/${lead.id}`);
    setEditing(null);
    reload();
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Enquiries from walk-ins, Instagram and WhatsApp. Follow up and convert"
        actions={
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" /> New lead
          </Button>
        }
      />
      {loading && <Skeleton className="h-96 rounded-2xl" />}
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 no-scrollbar">
        {data &&
          LEAD_STATUSES.map((col) => {
            const items = leads.filter((l) => l.status === col.value);
            return (
              <div key={col.value} className="w-[290px] shrink-0 snap-start">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn("h-2 w-2 rounded-full", COLUMN_TONE[col.value])} />
                  <p className="text-sm font-semibold">{col.label}</p>
                  <span className="rounded-md bg-surface-2 px-1.5 text-xs font-semibold text-muted">{items.length}</span>
                </div>
                <div className="space-y-3 rounded-2xl bg-surface-2/50 p-2 min-h-32">
                  {items.map((l) => {
                    const overdue = l.followUpAt && new Date(l.followUpAt) < new Date() && l.status !== "CONVERTED" && l.status !== "LOST";
                    return (
                      <Card key={l.id} hover className="cursor-pointer p-4" onClick={() => setEditing(l)}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{l.name}</p>
                          <Badge tone="gray">{LEAD_SOURCES.find((s) => s.value === l.source)?.label ?? humanize(l.source)}</Badge>
                        </div>
                        {l.interest && <p className="mt-1 text-xs text-muted">{l.interest}</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <a href={`tel:${l.phone.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-brand-600">
                            <LuPhone className="h-3 w-3" /> {l.phone}
                          </a>
                          <a
                            href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                          >
                            <LuMessageCircle className="h-3 w-3" /> WhatsApp
                          </a>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                          {l.followUpAt && l.status !== "CONVERTED" && l.status !== "LOST" ? (
                            <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", overdue ? "text-rose-600" : "text-muted")}>
                              <LuCalendar className="h-3 w-3" /> {overdue ? "Overdue · " : ""}
                              {formatShortDate(l.followUpAt)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted">{timeAgo(l.createdAt)}</span>
                          )}
                          <select
                            value={l.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => move(l, e.target.value as Lead["status"])}
                            className="cursor-pointer rounded-md bg-transparent text-[11px] font-semibold text-brand-600 outline-none dark:text-brand-300"
                          >
                            {LEAD_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                Move: {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New lead" : form.name}
        footer={
          <>
            {editing && editing !== "new" && (
              <Button variant="ghost" className="text-rose-600 sm:mr-auto" onClick={() => remove(editing)}>
                <LuTrash2 className="h-4 w-4" />
              </Button>
            )}
            {editing && editing !== "new" && !editing.convertedMember && (
              <Button variant="secondary" onClick={() => convert(editing)}>
                <LuUserCheck className="h-4 w-4" /> Convert to member
              </Button>
            )}
            <Button onClick={save} loading={saving} disabled={!form.name}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Mobile" required>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Source">
            <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Follow up on">
            <Input type="date" value={form.followUpAt} onChange={(e) => setForm({ ...form, followUpAt: e.target.value })} />
          </Field>
          <Field label="Interested in" className="sm:col-span-2">
            <Input value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} placeholder="Annual membership, PT, ladies classes…" />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
