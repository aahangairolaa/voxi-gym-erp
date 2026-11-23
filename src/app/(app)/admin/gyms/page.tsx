"use client";
import { useState } from "react";
import { LuBuilding2, LuDownload, LuPlus, LuSearch } from "react-icons/lu";
import { CreateGymModal, GymsTable, planText, STATUS_LABEL, useAdminData } from "@/components/admin/gym-admin";
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { toCsv } from "@/lib/csv";
import { downloadBlob } from "@/lib/docs/render";
import type { GymStatus } from "@/types/api";

/** Every gym on VOXI: search, filter, open to manage. */
export default function AdminGymsPage() {
  const { gyms, sizeOf, setEditing, manage, reload } = useAdminData();
  const [filter, setFilter] = useState<"ALL" | GymStatus | "REQUESTS">("ALL");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  if (gyms.error) return <ErrorState message={gyms.error} onRetry={gyms.reload} />;
  const all = gyms.data?.gyms ?? [];
  const term = q.trim().toLowerCase();
  const rows = all
    .filter((g) => (filter === "ALL" ? true : filter === "REQUESTS" ? !!g.planRequest : g.status === filter))
    .filter((g) => !term || [g.name, g.slug, g.owner?.name, g.owner?.email, g.phone].some((v) => v?.toLowerCase().includes(term)));
  const count = (f: typeof filter) => all.filter((g) => (f === "ALL" ? true : f === "REQUESTS" ? !!g.planRequest : g.status === f)).length;

  const exportCsv = () => {
    const csv = toCsv([
      ["Gym", "Status", "Plan", "Paid until", "Trial ends", "Owner", "Owner email", "Members", "Staff", "Branches", "Revenue 30d (QAR)", "Created"],
      ...rows.map((g) => [g.name, STATUS_LABEL[g.status], planText(g.billingMonths, g.extraBranches), g.paidUntil?.slice(0, 10), g.trialEndsAt?.slice(0, 10), g.owner?.name, g.owner?.email, g.members, g.staffCount, g.branches, g.revenue30d, g.createdAt.slice(0, 10)]),
    ]);
    downloadBlob(new Blob([csv], { type: "text/csv" }), "voxi-gyms.csv");
  };

  return (
    <>
      <PageHeader
        title="All gyms"
        subtitle="Search, filter and manage every gym on VOXI"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
              <LuDownload className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setCreating(true)}>
              <LuPlus className="h-4 w-4" /> New gym
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <LuSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search gym, owner or email" className="pl-9" />
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All", count: count("ALL") },
            { value: "ACTIVE", label: "Paying", count: count("ACTIVE") },
            { value: "TRIAL", label: "Trial", count: count("TRIAL") },
            { value: "SUSPENDED", label: "Suspended", count: count("SUSPENDED") },
            { value: "REQUESTS", label: "Requests", count: count("REQUESTS") },
          ]}
        />
      </div>
      <Card>
        {gyms.loading && <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>}
        {gyms.data && rows.length === 0 && <EmptyState icon={LuBuilding2} title="No gyms here" message={term ? "Try another search." : undefined} />}
        {rows.length > 0 && <GymsTable gyms={rows} sizeOf={sizeOf} onManage={setEditing} />}
      </Card>
      <p className="mt-3 text-xs text-muted">For privacy, VOXI admins see each gym’s totals only, never its members’ details.</p>
      <CreateGymModal open={creating} onClose={() => setCreating(false)} onDone={reload} />
      {manage}
    </>
  );
}
