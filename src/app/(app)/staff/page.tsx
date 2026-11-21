"use client";
import { useEffect, useState } from "react";
import { LuPencil, LuPlus, LuUserCog } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Toggle, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useBranches } from "@/hooks/use-lookups";
import { api } from "@/lib/api-client";
import { formatQAR, timeAgo } from "@/lib/format";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/permissions";
import type { StaffMember } from "@/types/api";

const ROLE_TONE: Record<Role, "brand" | "blue" | "green" | "amber" | "gray"> = { SUPER_ADMIN: "brand", OWNER: "brand", MANAGER: "blue", RECEPTION: "green", TRAINER: "amber", HOUSEKEEPING: "gray" };
const ROLE_HELP: Record<Role, string> = {
  OWNER: "Everything, including settings and salaries",
  MANAGER: "All operations, reports, staff (except owners/managers)",
  RECEPTION: "Members, sales, payments, cash drawer, check-in",
  TRAINER: "Members (view), check-in, workouts, classes",
  HOUSEKEEPING: "Cleaning checklist & reporting problems only (phone-friendly)",
  SUPER_ADMIN: "VOXI platform team",
};
const blank = { name: "", email: "", phone: "", role: "RECEPTION" as Role, branchId: "", salary: "" as number | "", specialty: "", isActive: true, password: "" };

export default function StaffPage() {
  const me = useUser();
  const toast = useToast();
  const branches = useBranches();
  const { data, loading, reload } = useApi<{ staff: StaffMember[] }>("/api/staff");
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowedRoles = me.role === "OWNER" ? ROLES : (["RECEPTION", "TRAINER", "HOUSEKEEPING"] as Role[]);

  useEffect(() => {
    setError(null);
    if (editing === "new") setForm(blank);
    else if (editing)
      setForm({
        name: editing.name, email: editing.email, phone: editing.phone ?? "", role: editing.role, branchId: editing.branchId ?? "",
        salary: editing.salary ?? "", specialty: editing.specialty ?? "", isActive: editing.isActive, password: "",
      });
  }, [editing]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, phone: form.phone || null, branchId: form.branchId || null, salary: form.salary === "" ? null : form.salary, specialty: form.specialty || null };
      if (editing === "new") await api.post("/api/staff", body);
      else if (editing) await api.put(`/api/staff/${editing.id}`, body);
      toast("success", "Staff saved");
      setEditing(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const staff = data?.staff ?? [];
  const payroll = staff.filter((s) => s.isActive).reduce((sum, s) => sum + (s.salary ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle={me.role === "OWNER" && payroll ? `${staff.filter((s) => s.isActive).length} active · monthly payroll ${formatQAR(payroll)}` : "Team accounts and roles"}
        actions={
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" /> Add staff
          </Button>
        }
      />
      {loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>}
      {data && staff.length === 0 && <EmptyState icon={LuUserCog} title="No staff yet" />}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((s) => (
          <Card key={s.id} hover className={`p-5 ${s.isActive ? "" : "opacity-55"}`}>
            <div className="flex items-start gap-3">
              <Avatar name={s.name} size={46} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="truncate text-xs text-muted">{s.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={ROLE_TONE[s.role]}>{ROLE_LABEL[s.role]}</Badge>
                  {s.branch && <Badge>{s.branch.name}</Badge>}
                  {!s.isActive && <Badge tone="red">Inactive</Badge>}
                </div>
              </div>
              {(me.role === "OWNER" || s.role === "RECEPTION" || s.role === "TRAINER" || s.role === "HOUSEKEEPING") && (
                <Button size="icon" variant="ghost" onClick={() => setEditing(s)} aria-label="Edit">
                  <LuPencil className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
              <div>
                <p className="text-muted">{s.specialty ? "Specialty" : "Phone"}</p>
                <p className="truncate font-medium">{s.specialty ?? s.phone ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-muted">{s.salary !== null ? "Salary" : "Last login"}</p>
                <p className="font-medium tabular-nums">{s.salary !== null ? formatQAR(s.salary) : s.lastLoginAt ? timeAgo(s.lastLoginAt) : "Never"}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add staff member" : `Edit ${form.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email (login)" required>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Role" hint={ROLE_HELP[form.role]}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
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
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          {me.role === "OWNER" && (
            <Field label="Monthly salary (QAR)">
              <Input type="number" min={0} value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value === "" ? "" : Number(e.target.value) })} />
            </Field>
          )}
          {form.role === "TRAINER" && (
            <Field label="Specialty">
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Strength & Conditioning" />
            </Field>
          )}
          <Field label={editing === "new" ? "Password" : "New password"} hint={editing === "new" ? "At least 8 characters" : "Leave empty to keep the current password"} required={editing === "new"}>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          </Field>
          <div className="sm:col-span-2">
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Account active (can sign in)" />
          </div>
          {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
