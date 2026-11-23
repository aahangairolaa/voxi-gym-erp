"use client";
import { LuCalendarClock, LuCircleAlert, LuCreditCard, LuTrendingUp } from "react-icons/lu";
import { GymMark, planText, useAdminData } from "@/components/admin/gym-admin";
import { daysUntil, useGymActions } from "@/components/admin/platform-tools";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { formatDate, formatQAR } from "@/lib/format";
import { quote, termFor } from "@/lib/pricing";

/** Paying gyms: what each pays, when it renews, and who is overdue. */
export default function AdminSubscriptionsPage() {
  const { gyms, setEditing, manage, reload } = useAdminData();
  const { busy, markPaid } = useGymActions(reload);
  if (gyms.error) return <ErrorState message={gyms.error} onRetry={gyms.reload} />;
  const rows = (gyms.data?.gyms ?? [])
    .filter((g) => g.status === "ACTIVE")
    .map((g) => ({ g, q: quote(g.billingMonths, g.extraBranches, g.cafeEnabled), left: daysUntil(g.paidUntil) }))
    .sort((a, b) => (a.left ?? 9999) - (b.left ?? 9999));
  const mrr = rows.reduce((s, r) => s + r.q.perMonth, 0);
  const due30 = rows.filter((r) => r.left !== null && r.left >= 0 && r.left <= 30);
  const overdue = rows.filter((r) => r.left !== null && r.left < 0);

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Paying gyms, what they pay and when they renew" />
      <div className="stagger mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard accent label="Monthly recurring revenue" value={formatQAR(mrr)} icon={<LuTrendingUp className="h-[18px] w-[18px]" />} />
        <StatCard label="Yearly run rate" value={formatQAR(mrr * 12)} icon={<LuCreditCard className="h-[18px] w-[18px]" />} hint={`${rows.length} paying gym${rows.length === 1 ? "" : "s"}`} />
        <StatCard label="Renewing in 30 days" value={formatQAR(due30.reduce((s, r) => s + r.q.total, 0))} icon={<LuCalendarClock className="h-[18px] w-[18px]" />} hint={`${due30.length} gym${due30.length === 1 ? "" : "s"}`} />
        <StatCard label="Overdue" value={overdue.length} icon={<LuCircleAlert className="h-[18px] w-[18px]" />} hint={overdue.length ? formatQAR(overdue.reduce((s, r) => s + r.q.total, 0)) : "Nobody"} />
      </div>
      <Card>
        {gyms.loading && <Skeleton className="m-4 h-40" />}
        {gyms.data && rows.length === 0 && <EmptyState icon={LuCreditCard} title="No paying gyms yet" />}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table min-w-[820px]">
              <thead>
                <tr>
                  <th>Gym</th>
                  <th>Plan</th>
                  <th className="text-right">Per term</th>
                  <th className="text-right">Per month</th>
                  <th>Paid until</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ g, q, left }) => (
                  <tr key={g.id}>
                    <td>
                      <button onClick={() => setEditing(g)} className="flex items-center gap-3 text-left">
                        <GymMark g={g} size={32} />
                        <span>
                          <span className="block font-semibold text-ink">{g.name}</span>
                          <span className="block text-xs text-muted">{g.owner?.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="text-sm">
                      {planText(g.billingMonths, g.extraBranches)}
                      {g.cafeEnabled ? " + Café" : ""}
                    </td>
                    <td className="text-right tabular-nums">{formatQAR(q.total)}</td>
                    <td className="text-right font-semibold tabular-nums">{formatQAR(q.perMonth)}</td>
                    <td>
                      {g.paidUntil ? formatDate(g.paidUntil) : "–"}
                      <span className="mt-0.5 block">
                        {left === null ? (
                          <Badge tone="gray">No date</Badge>
                        ) : left < 0 ? (
                          <Badge tone="red">Overdue {-left}d</Badge>
                        ) : left <= 30 ? (
                          <Badge tone="amber">Due in {left}d</Badge>
                        ) : (
                          <Badge tone="green">{left} days left</Badge>
                        )}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button size="sm" variant="secondary" loading={busy === g.id} onClick={() => markPaid(g)} title={`Extend by ${termFor(g.billingMonths).label}`}>
                        Mark paid
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Mark paid adds one more term to the paid-until date (from today if it has already passed).</p>
      {manage}
    </>
  );
}
