"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuFingerprint, LuSearch, LuUserPlus, LuUsers } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { MemberFormModal } from "@/components/members/member-form-modal";
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, Segmented, Select, ShowMore, Skeleton, StatusBadge } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useLimit } from "@/hooks/use-limit";
import { useDebounce } from "@/hooks/use-debounce";
import { useBranches } from "@/hooks/use-lookups";
import { useQueryParam } from "@/hooks/use-query-param";
import { withQuery } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { MembersResponse } from "@/types/api";

const STATUSES = ["ALL", "ACTIVE", "EXPIRING", "FROZEN", "EXPIRED", "NONE"] as const;
type StatusFilter = (typeof STATUSES)[number];
const LABEL: Record<StatusFilter, string> = { ALL: "All", ACTIVE: "Active", EXPIRING: "Expiring", FROZEN: "Frozen", EXPIRED: "Expired", NONE: "No plan" };

export default function MembersPage() {
  const user = useUser();
  const router = useRouter();
  const branches = useBranches();
  const initialStatus = useQueryParam("status");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [creating, setCreating] = useState(false);
  const q = useDebounce(search, 250);

  useEffect(() => {
    if (initialStatus && STATUSES.includes(initialStatus as StatusFilter)) setStatus(initialStatus as StatusFilter);
  }, [initialStatus]);

  const { data, error, loading, reload } = useApi<MembersResponse>(withQuery("/api/members", { search: q, status, branchId }));
  const page = useLimit(data?.members);

  return (
    <>
      <PageHeader
        title="Members"
        subtitle={data ? `${data.counts.ALL} members${branchId ? "" : " across all branches"}` : "Everyone who trains with you"}
        actions={
          can(user.role, "memberships") && (
            <Button onClick={() => setCreating(true)}>
              <LuUserPlus className="h-4 w-4" /> New member
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={status}
            onChange={setStatus}
            options={STATUSES.map((s) => ({ value: s, label: LABEL[s], count: data?.counts[s] }))}
          />
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-72">
              <LuSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input pl-10" placeholder="Name, M-1001, phone, QID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-36">
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}
        {data && data.members.length === 0 && (
          <EmptyState icon={LuUsers} title="No members found" message={search ? "Try a different search." : "Add your first member to get started."} />
        )}

        {data && data.members.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>ID</th>
                    <th>Branch</th>
                    <th>Plan</th>
                    <th>Expires</th>
                    <th className="text-center">Bio</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {page.visible.map((m) => (
                    <tr key={m.id} className="cursor-pointer" onClick={() => router.push(`/members/${m.id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} size={34} />
                          <div className="min-w-0">
                            <Link href={`/members/${m.id}`} className="block truncate font-semibold text-ink hover:text-brand-600" onClick={(e) => e.stopPropagation()}>
                              {m.name}
                            </Link>
                            <p className="truncate text-xs text-muted">{m.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-ink-soft">{m.code}</td>
                      <td className="text-ink-soft">{m.branch?.name ?? "—"}</td>
                      <td>
                        {m.plan ? (
                          <span className="inline-flex items-center gap-2 text-ink-soft">
                            <span className="h-2 w-2 rounded-full" style={{ background: m.plan.color }} />
                            {m.plan.name}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <p className="text-ink-soft tabular-nums">{formatDate(m.endDate)}</p>
                        {m.daysLeft !== null && m.daysLeft >= 0 && m.status !== "FROZEN" && (
                          <p className={cn("text-[11px]", m.daysLeft <= 7 ? "text-amber-600" : "text-muted")}>{m.daysLeft} days left</p>
                        )}
                      </td>
                      <td className="text-center">
                        <LuFingerprint className={cn("inline h-4 w-4", m.biometricId ? "text-brand-500" : "text-line-strong")} />
                      </td>
                      <td>
                        <StatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {page.visible.map((m) => (
                <li key={m.id}>
                  <Link href={`/members/${m.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                    <Avatar name={m.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{m.name}</p>
                      <p className="truncate text-xs text-muted">
                        {m.code} · {m.plan?.name ?? "No plan"} {m.endDate ? `· ${formatDate(m.endDate)}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </Link>
                </li>
              ))}
            </ul>
            <ShowMore remaining={page.remaining} onClick={page.more} />
          </>
        )}
      </Card>

      <MemberFormModal open={creating} onClose={() => setCreating(false)} onSaved={(id) => router.push(`/members/${id}`)} />
    </>
  );
}
