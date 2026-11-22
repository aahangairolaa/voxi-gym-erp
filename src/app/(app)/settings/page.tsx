"use client";
import { PhoneInput } from "@/components/ui/phone-input";
import { useEffect, useState } from "react";
import { LuBuilding2, LuKey, LuPlus } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { GymProfileCard } from "@/components/settings/gym-profile-card";
import { WhatsAppSettingsCard } from "@/components/settings/whatsapp-settings-card";
import { RolesAccessCard } from "@/components/settings/roles-access-card";
import { Button, Card, CardHeader, Field, Input, Modal, PageHeader, Toggle, useConfirm, useToast } from "@/components/ui";
import { invalidate, useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import type { Branch, Settings } from "@/types/api";

export default function SettingsPage() {
  const user = useUser();
  const confirm = useConfirm();
  const toast = useToast();
  const isOwner = can(user.role, "settings", user.gym?.rolePermissions);
  // VOXI admins only use this page to change their password
  const gymStaff = !!user.gymId;
  const settings = useApi<Settings>(gymStaff ? "/api/settings" : null);
  const branches = useApi<{ branches: Branch[] }>(gymStaff ? "/api/branches" : null);
  const [branchEdit, setBranchEdit] = useState<Branch | "new" | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "", isActive: true });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (branchEdit === "new") setBranchForm({ name: "", address: "", phone: "", isActive: true });
    else if (branchEdit) setBranchForm({ name: branchEdit.name, address: branchEdit.address ?? "", phone: branchEdit.phone ?? "", isActive: branchEdit.isActive });
  }, [branchEdit]);

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
      toast("success", user.hasPassword ? "Password changed" : "Password set. You can now also sign in with email");
      setPw({ currentPassword: "", newPassword: "" });
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const signOutOthers = async () => {
    const ok = await confirm({
      title: "Sign out on all other devices?",
      message: "Any phone, tablet or computer signed in to your account (except this one) will need to sign in again.",
      confirmLabel: "Sign out others",
    });
    if (!ok) return;
    try {
      await api.post("/api/auth/sessions");
      toast("success", "Signed out on all other devices");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle={gymStaff ? "Gym profile, WhatsApp, branches and your account" : "Your account"} />
      <div className="grid gap-5 lg:grid-cols-3">
        {gymStaff && (
          <div className="space-y-5 lg:col-span-2">
            <GymProfileCard settings={settings.data} editable={isOwner} onSaved={settings.reload} />
            {isOwner && <RolesAccessCard />}
            {isOwner && <WhatsAppSettingsCard />}
          </div>
        )}

        <div className="space-y-5">
          {gymStaff && (
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
                      {b.address ?? "–"} · {b._count?.members ?? 0} members · {b._count?.staff ?? 0} staff
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          )}

          <Card id="password">
            <CardHeader
              title={user.hasPassword ? "Change my password" : "Set a password"}
              subtitle={user.hasGoogle ? "Your account is linked to Google" : undefined}
              icon={<LuKey className="h-[18px] w-[18px]" />}
            />
            <div className="space-y-3 px-5 pb-5">
              {user.hasPassword && (
                <Field label="Current password">
                  <Input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" />
                </Field>
              )}
              <Field label="New password" hint="At least 8 characters">
                <Input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />
              </Field>
              <Button onClick={changePassword} disabled={(user.hasPassword && !pw.currentPassword) || pw.newPassword.length < 8} className="w-full">
                {user.hasPassword ? "Update password" : "Set password"}
              </Button>
              <button onClick={signOutOthers} className="w-full pt-1 text-center text-xs font-medium text-muted hover:text-rose-600">
                Sign out on all other devices
              </button>
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
            <PhoneInput value={branchForm.phone} onChange={(v) => setBranchForm({ ...branchForm, phone: v })} />
          </Field>
          <Toggle checked={branchForm.isActive} onChange={(v) => setBranchForm({ ...branchForm, isActive: v })} label="Active" />
        </div>
      </Modal>
    </>
  );
}
