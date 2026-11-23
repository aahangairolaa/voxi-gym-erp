"use client";
import { useEffect, useState } from "react";
import { LuShieldCheck } from "react-icons/lu";
import { Button, Card, CardHeader, Skeleton, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { CONFIGURABLE_ROLES, PERMISSIONS, ROLE_LABEL, allowed, type RolePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** Owner-only: switch confidential areas on or off for each role. */
export function RolesAccessCard() {
  const toast = useToast();
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

  return (
    <Card>
      <CardHeader
        icon={<LuShieldCheck className="h-[18px] w-[18px]" />}
        title="Roles and access"
        subtitle="Choose what each role can see. Owners see everything."
        action={
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
            Save
          </Button>
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
                    const possible = p.roles.includes(r);
                    const on = possible && allowed(r, p.key, perms);
                    return (
                      <td key={r} className="text-center">
                        {possible ? (
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
                        ) : (
                          <span className="sr-only">Not available for this role</span>
                        )}
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
