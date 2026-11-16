"use client";
import { useEffect, useState } from "react";
import { LuBuilding2, LuKey, LuPlus, LuStore } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { Button, Card, CardHeader, Field, Input, Modal, PageHeader, Skeleton, Textarea, Toggle, useToast } from "@/components/ui";
import { invalidate, useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import type { Branch, Settings } from "@/types/api";

export default function SettingsPage() {
  const user = useUser();
  const toast = useToast();
  const isOwner = can(user.role, "settings");
  const settings = useApi<Settings>("/api/settings");
  const branches = useApi<{ branches: Branch[] }>("/api/branches");
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [branchEdit, setBranchEdit] = useState<Branch | "new" | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "", isActive: true });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);
  useEffect(() => {
    if (branchEdit === "new") setBranchForm({ name: "", address: "", phone: "", isActive: true });
    else if (branchEdit) setBranchForm({ name: branchEdit.name, address: branchEdit.address ?? "", phone: branchEdit.phone ?? "", isActive: branchEdit.isActive });
  }, [branchEdit]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await api.put("/api/settings", form);
      toast("success", "Settings saved");
      settings.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const saveBranch = async () => {
    try {
      const body = { ...branchForm, address: branchForm.address || null, phone: branchForm.phone || null };
      if (branchEdit === "new") await api.post("/api/branches", body);
      else if (branchEdit) await api.put(`/api/branches/${branchEdit.id}`, body);
      invalidate("/api/branches");
      toast("success", "Branch saved");
      setBranchEdit(null);
      branches.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const changePassword = async () => {
    try {
      await api.post("/api/auth/password", pw);
      toast("success", "Password changed");
      setPw({ currentPassword: "", newPassword: "" });
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const f = (key: keyof Settings) => ({
    value: (form?.[key] ?? "") as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => form && setForm({ ...form, [key]: key === "expiryWarnDays" ? Number(e.target.value) : e.target.value }),
    disabled: !isOwner,
  });

  return (
    <>
      <PageHeader title="Settings" subtitle="Gym profile, branches and your account" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Gym profile" subtitle="Appears on invoices and receipts" icon={<LuStore className="h-[18px] w-[18px]" />} />
          {!form ? (
            <Skeleton className="m-5 h-72" />
          ) : (
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field label="Gym name" required>
                <Input {...f("gymName")} />
              </Field>
              <Field label="Legal name">
                <Input {...f("legalName")} placeholder="VOXI Fitness W.L.L." />
              </Field>
              <Field label="Commercial Registration (CR) no.">
                <Input {...f("crNumber")} />
              </Field>
              <Field label="Phone">
                <Input {...f("phone")} />
              </Field>
              <Field label="Email">
                <Input {...f("email")} />
              </Field>
              <Field label="Website">
                <Input {...f("website")} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input {...f("address")} />
              </Field>
              <Field label="Invoice prefix" hint="e.g. INV → INV-000123">
                <Input {...f("invoicePrefix")} />
              </Field>
              <Field label="“Expiring soon” warning (days)">
                <Input type="number" min={1} max={60} {...f("expiryWarnDays")} />
              </Field>
              <Field label="Invoice footer" className="sm:col-span-2">
                <Textarea rows={2} {...f("invoiceFooter")} />
              </Field>
              <div className="flex items-center justify-between sm:col-span-2">
                <p className="text-xs text-muted">Currency: Qatari Riyal (QAR) · Time zone: Asia/Qatar (UTC+3)</p>
                {isOwner && (
                  <Button onClick={save} loading={saving}>
                    Save changes
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Branches"
              icon={<LuBuilding2 className="h-[18px] w-[18px]" />}
              action={
                isOwner && (
                  <Button size="sm" variant="soft" onClick={() => setBranchEdit("new")}>
                    <LuPlus className="h-3.5 w-3.5" /> Add
                  </Button>
                )
              }
            />
            <ul className="space-y-1 px-3 pb-4">
              {branches.data?.branches.map((b) => (
                <li key={b.id}>
                  <button disabled={!isOwner} onClick={() => setBranchEdit(b)} className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 disabled:hover:bg-transparent">
                    <p className="text-sm font-semibold">
                      {b.name} {!b.isActive && <span className="text-xs font-normal text-muted">(inactive)</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {b.address ?? "—"} · {b._count?.members ?? 0} members · {b._count?.staff ?? 0} staff
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card id="password">
            <CardHeader title="Change my password" icon={<LuKey className="h-[18px] w-[18px]" />} />
            <div className="space-y-3 px-5 pb-5">
              <Field label="Current password">
                <Input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <Input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />
              </Field>
              <Button onClick={changePassword} disabled={!pw.currentPassword || pw.newPassword.length < 8} className="w-full">
                Update password
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={!!branchEdit} onClose={() => setBranchEdit(null)} title={branchEdit === "new" ? "Add branch" : "Edit branch"} footer={<Button onClick={saveBranch} disabled={!branchForm.name}>Save</Button>}>
        <div className="space-y-4">
          <Field label="Name" required>
            <Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="West Bay" />
          </Field>
          <Field label="Address">
            <Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
          </Field>
          <Toggle checked={branchForm.isActive} onChange={(v) => setBranchForm({ ...branchForm, isActive: v })} label="Active" />
        </div>
      </Modal>
    </>
  );
}
