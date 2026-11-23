"use client";
import { useEffect, useState } from "react";
import { LuRotateCcw, LuShieldCheck } from "react-icons/lu";
import { Button, Card, CardHeader, Skeleton, useConfirm, useToast } from "@/components/ui";
import { invalidate, useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { CONFIGURABLE_ROLES, PERMISSIONS, ROLE_LABEL, allowed, type RolePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** Owner-only: switch confidential areas on or off for each role. */
export function RolesAccessCard() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data } = useApi<{ permissions: RolePermissions }>("/api/settings/permissions");
  const [perms, setPerms] = useState<RolePermissions>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) setPerms(data.permissions);
  }, [data]);

  const toggle = (role: (typeof CONFIGURABLE_ROLES)[number], key: (typeof PERMISSIONS)[number]["key"]) => {
    const on = allowed(role, key, perms);
    setPerms((p) => ({ ...p, [role]: { ...p[role], [key]: !on } }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/settings/permissions", { permissions: perms });
      toast("success", "Access saved. It applies to your team straight away.");
      setDirty(false);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const isDefault = Object.values(perms).every((r) => !r || Object.keys(r).length === 0);
  const reset = async () => {
    const ok = await confirm({
      title: "Reset access to the defaults?",
      message: "Every role goes back to VOXI's starting access: managers see almost everything, reception runs the front desk without money totals, trainers see members, attendance, classes and workouts.",
      confirmLabel: "Reset",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await api.put("/api/settings/permissions", { permissions: {} });
      setPerms({});
      setDirty(false);
      invalidate("/api/settings/permissions");
      toast("success", "Access reset to the defaults.");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={<LuShieldCheck className="h-[18px] w-[18px]" />}
        title="Roles and access"
        subtitle="You decide how much each role can do. Owners always see everything."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={reset} disabled={saving || (isDefault && !dirty)}>
              <LuRotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </Button>
            <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
              Save
            </Button>
          </div>
        }
      />
      {!data ? (
        <div className="p-5">
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table min-w-[560px]">
            <thead>
              <tr>
                <th>Area</th>
                {CONFIGURABLE_ROLES.map((r) => (
                  <th key={r} className="text-center">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.key}>
                  <td>
                    <p className="font-medium text-ink">{p.label}</p>
                    <p className="text-xs text-muted">{p.hint}</p>
                  </td>
                  {CONFIGURABLE_ROLES.map((r) => {
                    const on = allowed(r, p.key, perms);
                    return (
                      <td key={r} className="text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`${p.label} for ${ROLE_LABEL[r]}`}
                          onClick={() => toggle(r, p.key)}
                          className={cn("relative inline-block h-6 w-11 rounded-full transition-colors", on ? "bg-brand-600" : "bg-line-strong")}
                        >
                          <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200", on && "translate-x-5")} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
