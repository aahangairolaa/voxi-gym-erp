"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LuIdCard, LuSearch, LuSnowflake, LuPlay, LuCircleX } from "react-icons/lu";
import { SellMembershipModal } from "@/components/members/sell-membership-modal";
import { RecordPaymentModal } from "@/components/members/record-payment-modal";
import {
  Avatar, Button, Card, EmptyState, ErrorState, PageHeader, Segmented, ShowMore, Skeleton, StatCard, StatusBadge, useConfirm, useToast,
} from "@/components/ui";
import { invalidate, useApi } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { useLimit } from "@/hooks/use-limit";
import { useQueryParam } from "@/hooks/use-query-param";
import { api, withQuery } from "@/lib/api-client";
import { formatDate, formatQAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MembershipRow, MembershipsResponse, SearchResult } from "@/types/api";

const FILTERS = ["ALL", "ACTIVE", "EXPIRING", "FROZEN", "EXPIRED", "CANCELLED"] as const;
type F = (typeof FILTERS)[number];

export default function MembershipsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const initial = useQueryParam("status");
  const [status, setStatus] = useState<F>("ALL");
  const [search, setSearch] = useState("");
  const [sell, setSell] = useState<{ open: boolean; member: SearchResult | null }>({ open: false, member: null });
  const [collect, setCollect] = useState<MembershipRow | null>(null);
  const q = useDebounce(search, 250);
  useEffect(() => {
    if (initial && FILTERS.includes(initial as F)) setStatus(initial as F);
  }, [initial]);

  const { data, error, loading, reload } = useApi<MembershipsResponse>(withQuery("/api/memberships", { status, search: q }));

  const page = useLimit(data?.memberships);

  const act = async (row: MembershipRow, action: "freeze" | "unfreeze" | "cancel") => {
    if (action === "cancel" && !(await confirm({ title: `Cancel ${row.member.name}'s ${row.plan.name}?`, confirmLabel: "Cancel membership", danger: true }))) return;
    try {
      await api.post(`/api/memberships/${row.id}`, { action });
      invalidate("/api/");
      toast("success", "Membership updated");
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const asResult = (r: MembershipRow): SearchResult => ({ id: r.member.id, code: r.member.code, name: r.member.name, phone: r.member.phone, status: r.status === "CANCELLED" ? "NONE" : r.status, plan: r.plan.name });

  return (
    <>
      <PageHeader
        title="Memberships"
        subtitle="Every plan sold. Renew, freeze or collect balances"
        actions={
          <Button onClick={() => setSell({ open: true, member: null })}>
            <LuIdCard className="h-4 w-4" /> Sell membership
          </Button>
        }
      />
      <div className="stagger mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active" value={data?.summary.active ?? "–"} />
        <StatCard label="Expiring ≤ 7 days" value={data?.summary.expiring ?? "–"} />
        <StatCard label="Frozen" value={data?.summary.frozen ?? "–"} />
        <StatCard label="Outstanding balances" value={data ? formatQAR(data.summary.outstanding) : "–"} />
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented value={status} onChange={setStatus} options={FILTERS.map((f) => ({ value: f, label: f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase() }))} />
          <div className="relative lg:w-72">
            <LuSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-10" placeholder="Search member…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && <div className="space-y-3 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>}
        {data && data.memberships.length === 0 && <EmptyState icon={LuIdCard} title="No memberships match" />}
        {data && data.memberships.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table min-w-[860px]">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Period</th>
                  <th className="text-right">Paid / Price</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {page.visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/members/${r.member.id}`} className="flex items-center gap-3">
                        <Avatar name={r.member.name} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink hover:text-brand-600">{r.member.name}</p>
                          <p className="font-mono text-[11px] text-muted">{r.member.code}</p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: r.plan.color }} />
                        {r.plan.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-ink-soft">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                      {(r.status === "ACTIVE" || r.status === "EXPIRING") && <p className={cn("text-[11px]", r.daysLeft <= 7 ? "text-amber-600" : "text-muted")}>{r.daysLeft} days left</p>}
                    </td>
                    <td className="text-right tabular-nums">
                      <span className={r.balance > 0 ? "font-semibold text-amber-600" : "text-ink"}>{formatQAR(r.paid)}</span>
                      <span className="text-muted"> / {formatQAR(r.price - r.discount)}</span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {r.balance > 0 && r.status !== "CANCELLED" && (
                          <Button size="sm" variant="soft" onClick={() => setCollect(r)}>
                            Collect
                          </Button>
                        )}
                        {(r.status === "EXPIRING" || r.status === "EXPIRED") && (
                          <Button size="sm" variant="soft" onClick={() => setSell({ open: true, member: asResult(r) })}>
                            Renew
                          </Button>
                        )}
                        {r.status === "FROZEN" && (
                          <Button size="sm" variant="ghost" onClick={() => act(r, "unfreeze")} title="Unfreeze">
                            <LuPlay className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {(r.status === "ACTIVE" || r.status === "EXPIRING") && r.plan.freezeDays > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => act(r, "freeze")} title="Freeze">
                            <LuSnowflake className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {r.status !== "CANCELLED" && r.status !== "EXPIRED" && (
                          <Button size="sm" variant="ghost" onClick={() => act(r, "cancel")} title="Cancel" className="hover:text-rose-600">
                            <LuCircleX className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ShowMore remaining={page.remaining} onClick={page.more} />
          </div>
        )}
      </Card>
      <SellMembershipModal open={sell.open} member={sell.member} onClose={() => setSell({ open: false, member: null })} onDone={reload} />
      <RecordPaymentModal
        open={!!collect}
        onClose={() => setCollect(null)}
        member={collect ? asResult(collect) : null}
        membershipId={collect?.id}
        defaultAmount={collect?.balance}
        defaultDescription={collect ? `${collect.plan.name} balance` : undefined}
        onDone={reload}
      />
    </>
  );
}
