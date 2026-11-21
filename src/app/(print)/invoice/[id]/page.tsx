"use client";
import { useParams } from "next/navigation";
import { LuPrinter } from "react-icons/lu";
import { Logo } from "@/components/brand/logo";
import { Button, Skeleton } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { formatDate, formatDateTime, formatQAR, humanize } from "@/lib/format";
import type { Settings } from "@/types/api";

type Invoice = {
  payment: {
    invoiceNo: string;
    amount: number;
    method: string;
    status: string;
    description: string | null;
    reference: string | null;
    paidAt: string;
    member: { code: string; firstName: string; lastName: string; phone: string; email: string | null; qid: string | null } | null;
    membership: { startDate: string; endDate: string; price: number; discount: number; plan: { name: string } } | null;
    receivedBy: { name: string } | null;
  };
  settings: Settings | null;
};

/** Printable A4 invoice / receipt. Opens in a new tab from Payments. */
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<Invoice>(`/api/payments/${id}`);

  if (error) return <p className="p-10 text-center text-muted">{error}</p>;
  if (!data) return <Skeleton className="mx-auto mt-10 h-[600px] max-w-3xl" />;
  const { payment: p, settings: s } = data;

  return (
    <div className="min-h-dvh bg-surface-2 px-4 py-8 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-3xl justify-end">
        <Button onClick={() => window.print()}>
          <LuPrinter className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-line bg-white p-8 text-[#15122b] shadow-xl sm:p-12 print:rounded-none print:border-0 print:shadow-none">
        {p.status === "REFUNDED" && (
          <div className="pointer-events-none absolute top-16 right-[-40px] rotate-[25deg] border-4 border-rose-500 px-6 py-1 text-2xl font-black tracking-widest text-rose-500 opacity-70">REFUNDED</div>
        )}
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            {s?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt={s.name} className="h-14 max-w-[200px] object-contain" />
            ) : (
              <Logo className="!text-[#15122b]" />
            )}
            <p className="mt-3 text-sm font-semibold">{s?.legalName ?? s?.name}</p>
            <p className="max-w-xs text-xs text-[#6e6a88]">{s?.address}</p>
            <p className="text-xs text-[#6e6a88]">
              {s?.phone} {s?.email && `· ${s.email}`}
            </p>
            {s?.crNumber && <p className="text-xs text-[#6e6a88]">CR No. {s.crNumber}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold tracking-[0.25em] text-[#6a44f2] uppercase">Receipt</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{p.invoiceNo}</p>
            <p className="mt-2 text-xs text-[#6e6a88]">Date: {formatDateTime(p.paidAt)}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 rounded-2xl bg-[#f5f2ff] p-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#6e6a88] uppercase">Billed to</p>
            {p.member ? (
              <>
                <p className="mt-1 font-semibold">
                  {p.member.firstName} {p.member.lastName}
                </p>
                <p className="text-xs text-[#6e6a88]">Member {p.member.code}</p>
                <p className="text-xs text-[#6e6a88]">{p.member.phone}</p>
                {p.member.qid && <p className="text-xs text-[#6e6a88]">QID {p.member.qid}</p>}
              </>
            ) : (
              <p className="mt-1 font-semibold">Walk-in customer</p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#6e6a88] uppercase">Payment</p>
            <p className="mt-1 font-semibold">{humanize(p.method)}</p>
            {p.reference && <p className="text-xs text-[#6e6a88]">Ref. {p.reference}</p>}
            {p.receivedBy && <p className="text-xs text-[#6e6a88]">Received by {p.receivedBy.name}</p>}
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#15122b] text-left text-[11px] tracking-wider uppercase">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#e8e5f2]">
              <td className="py-4">
                <p className="font-semibold">{p.description ?? (p.membership ? `${p.membership.plan.name} membership` : "Payment")}</p>
                {p.membership && (
                  <p className="text-xs text-[#6e6a88]">
                    Valid {formatDate(p.membership.startDate)} – {formatDate(p.membership.endDate)}
                    {p.membership.discount > 0 && ` · plan price ${formatQAR(p.membership.price)}, discount ${formatQAR(p.membership.discount)}`}
                  </p>
                )}
              </td>
              <td className="py-4 text-right font-semibold tabular-nums">{formatQAR(p.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-[#6e6a88]">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatQAR(p.amount)}</span>
          </div>
          <div className="flex justify-between text-[#6e6a88]">
            <span>VAT</span>
            <span>Not applicable</span>
          </div>
          <div className="flex justify-between border-t-2 border-[#15122b] pt-2 text-lg font-bold">
            <span>{p.status === "REFUNDED" ? "Refunded" : "Paid"}</span>
            <span className="tabular-nums">{formatQAR(p.amount)}</span>
          </div>
        </div>
        {s?.invoiceFooter && <p className="mt-12 border-t border-[#e8e5f2] pt-4 text-center text-xs text-[#6e6a88]">{s.invoiceFooter}</p>}
        <p className="mt-4 text-center text-[10px] tracking-widest text-[#b7b2cc] uppercase">Powered by VOXI</p>
      </div>
    </div>
  );
}
