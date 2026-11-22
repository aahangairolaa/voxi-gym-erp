"use client";
import { allowed } from "@/lib/permissions";
import { useState } from "react";
import Link from "next/link";
import { LuPlus, LuPrinter, LuSearch, LuUndo2, LuBanknote, LuCreditCard, LuSmartphone, LuBuilding2, LuGlobe } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { RecordPaymentModal } from "@/components/members/record-payment-modal";
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, PaymentStatusBadge, Select, ShowMore, Skeleton, StatCard, useConfirm, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { useLimit } from "@/hooks/use-limit";
import { api, withQuery } from "@/lib/api-client";
import { PAYMENT_METHODS } from "@/lib/constants";
import { addDays, startOfMonth, toDateInput } from "@/lib/dates";
import { formatDateTime, formatQAR, humanize } from "@/lib/format";
import type { PaymentsResponse } from "@/types/api";

const ICON: Record<string, typeof LuBanknote> = { CASH: LuBanknote, CARD: LuCreditCard, FAWRAN: LuSmartphone, BANK_TRANSFER: LuBuilding2, ONLINE: LuGlobe };

export default function PaymentsPage() {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const [from, setFrom] = useState(toDateInput(startOfMonth()));
  const [to, setTo] = useState(toDateInput());
  const [method, setMethod] = useState("ALL");
  const [search, setSearch] = useState("");
  const [recording, setRecording] = useState(false);
  const q = useDebounce(search, 250);
  const { data, error, loading, reload } = useApi<PaymentsResponse>(withQuery("/api/payments", { from, to, method, search: q }));
  const page = useLimit(data?.payments);
  const canRefund = allowed(user.role, "refunds", user.gym?.rolePermissions);

  const preset = (days: number | "month") => {
    setTo(toDateInput());
    setFrom(days === "month" ? toDateInput(startOfMonth()) : toDateInput(addDays(new Date(), -days + 1)));
  };

  const refund = async (id: string, invoiceNo: string) => {
    if (!(await confirm({ title: `Refund ${invoiceNo}?`, message: "The payment will be marked as refunded and removed from revenue.", danger: true, confirmLabel: "Refund" }))) return;
    try {
      await api.post(`/api/payments/${id}/refund`);
      toast("success", "Payment refunded");
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="All income in QAR: memberships, PT and retail"
        actions={
          <Button onClick={() => setRecording(true)}>
            <LuPlus className="h-4 w-4" /> Record payment
          </Button>
        }
      />

      <div className="stagger mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard accent label="Collected" value={data ? formatQAR(data.totals.collected) : "–"} hint={data ? `${data.totals.count} payments` : undefined} />
        {(["CARD", "CASH", "FAWRAN"] as const).map((m) => {
          const Icon = ICON[m]!;
          return <StatCard key={m} label={humanize(m)} value={data ? formatQAR(data.totals.byMethod[m] ?? 0) : "–"} icon={<Icon className="h-[18px] w-[18px]" />} />;
        })}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-muted">→</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => preset(1)}>Today</Button>
              <Button size="sm" variant="ghost" onClick={() => preset(7)}>7d</Button>
              <Button size="sm" variant="ghost" onClick={() => preset("month")}>Month</Button>
            </div>
          </div>
          <div className="flex gap-2 xl:ml-auto">
            <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-40">
              <option value="ALL">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <div className="relative flex-1 xl:w-64">
              <LuSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input pl-10" placeholder="Invoice or member…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && <div className="space-y-3 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>}
        {data && data.payments.length === 0 && <EmptyState icon={LuBanknote} title="No payments in this period" />}
        {data && data.payments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table min-w-[860px]">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Member</th>
                  <th>For</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.visible.map((p) => {
                  const Icon = ICON[p.method] ?? LuBanknote;
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.invoiceNo}</td>
                      <td className="whitespace-nowrap text-ink-soft">{formatDateTime(p.paidAt)}</td>
                      <td>
                        {p.member ? (
                          <Link href={`/members/${p.member.id}`} className="font-semibold hover:text-brand-600">
                            {p.member.name}
                          </Link>
                        ) : (
                          <span className="text-muted">Walk-in</span>
                        )}
                      </td>
                      <td className="max-w-[220px] truncate text-ink-soft">{p.description ?? "–"}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-ink-soft">
                          <Icon className="h-3.5 w-3.5 text-muted" /> {humanize(p.method)}
                        </span>
                      </td>
                      <td className={`text-right font-semibold tabular-nums ${p.status === "REFUNDED" ? "text-muted line-through" : ""}`}>{formatQAR(p.amount)}</td>
                      <td>
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Link href={`/invoice/${p.id}`} target="_blank" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" title="Print invoice">
                            <LuPrinter className="h-4 w-4" />
                          </Link>
                          {canRefund && p.status === "PAID" && (
                            <button onClick={() => refund(p.id, p.invoiceNo)} className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" title="Refund">
                              <LuUndo2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ShowMore remaining={page.remaining} onClick={page.more} />
          </div>
        )}
      </Card>
      <RecordPaymentModal open={recording} onClose={() => setRecording(false)} onDone={reload} />
    </>
  );
}
