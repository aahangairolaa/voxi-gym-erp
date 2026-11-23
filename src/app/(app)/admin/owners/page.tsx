"use client";
import { useState } from "react";
import { LuDownload, LuMail, LuMessageCircle, LuSearch, LuUsers } from "react-icons/lu";
import { GymMark, STATUS_LABEL, STATUS_TONE, useAdminData } from "@/components/admin/gym-admin";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from "@/components/ui";
import { toCsv } from "@/lib/csv";
import { downloadBlob } from "@/lib/docs/render";
import { timeAgo } from "@/lib/format";
import { toWhatsAppNumber } from "@/lib/whatsapp-templates";

/** Every gym owner, to call, email or WhatsApp. */
export default function AdminOwnersPage() {
  const { gyms, setEditing, manage } = useAdminData();
  const [q, setQ] = useState("");
  if (gyms.error) return <ErrorState message={gyms.error} onRetry={gyms.reload} />;
  const term = q.trim().toLowerCase();
  const rows = (gyms.data?.gyms ?? [])
    .filter((g) => g.owner)
    .filter((g) => !term || [g.name, g.owner!.name, g.owner!.email, g.owner!.phone].some((v) => v?.toLowerCase().includes(term)))
    .sort((a, b) => a.owner!.name.localeCompare(b.owner!.name));

  const exportCsv = () =>
    downloadBlob(
      new Blob([toCsv([["Owner", "Email", "Phone", "Gym", "Status", "Signs in with", "Last sign-in"], ...rows.map((g) => [g.owner!.name, g.owner!.email, g.owner!.phone ?? g.phone, g.name, STATUS_LABEL[g.status], g.owner!.signIn, g.owner!.lastLoginAt?.slice(0, 10) ?? "never"])])], { type: "text/csv" }),
      "voxi-gym-owners.csv",
    );

  return (
    <>
      <PageHeader
        title="Gym owners"
        subtitle="The people who run each gym, to reach them quickly"
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
            <LuDownload className="h-4 w-4" /> Export
          </Button>
        }
      />
      <div className="relative mb-4 w-full max-w-xs">
        <LuSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or gym" className="pl-9" />
      </div>
      <Card>
        {gyms.loading && <Skeleton className="m-4 h-40" />}
        {gyms.data && rows.length === 0 && <EmptyState icon={LuUsers} title="No owners found" />}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table min-w-[780px]">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Gym</th>
                  <th>Signs in with</th>
                  <th>Last sign-in</th>
                  <th className="text-right">Contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => {
                  const o = g.owner!;
                  const phone = o.phone ?? g.phone;
                  return (
                    <tr key={g.id}>
                      <td>
                        <p className="font-semibold text-ink">{o.name}</p>
                        <p className="text-xs text-muted">{o.email}</p>
                        {phone && <p className="text-xs text-muted">{phone}</p>}
                      </td>
                      <td>
                        <button onClick={() => setEditing(g)} className="flex items-center gap-2 text-left">
                          <GymMark g={g} size={28} />
                          <span>
                            <span className="block text-sm font-medium text-ink">{g.name}</span>
                            <Badge tone={STATUS_TONE[g.status]}>{STATUS_LABEL[g.status]}</Badge>
                          </span>
                        </button>
                      </td>
                      <td className="text-sm text-ink-soft">{o.signIn}</td>
                      <td className="text-sm text-ink-soft">{o.lastLoginAt ? timeAgo(o.lastLoginAt) : "Never"}</td>
                      <td className="text-right">
                        <div className="inline-flex gap-1.5">
                          <a href={`mailto:${o.email}`} aria-label={`Email ${o.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-ink">
                            <LuMail className="h-4 w-4" />
                          </a>
                          {phone && (
                            <a href={`https://wa.me/${toWhatsAppNumber(phone)}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${o.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-emerald-600 hover:bg-surface-2">
                              <LuMessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {manage}
    </>
  );
}
