import { Logo } from "@/components/brand/logo";
import { formatDate, formatDateTime, formatQAR } from "@/lib/format";
import { L, METHOD, amountInWords, invoiceLines, memberName, type InvoiceData } from "@/lib/docs/invoice-model";

/** Bilingual label: English with the Arabic beside (inline) or beneath. */
function Bi({ l, className = "", inline = false }: { l: readonly [string, string]; className?: string; inline?: boolean }) {
  const ar = (
    <span dir="rtl" lang="ar" className="inline-block font-normal tracking-normal normal-case">
      {l[1]}
    </span>
  );
  return inline ? (
    <span className={className}>
      {l[0]}
      <span className="mx-1 opacity-50">·</span>
      {ar}
    </span>
  ) : (
    <span className={`block ${className}`}>
      <span className="block">{l[0]}</span>
      <span className="block opacity-80">{ar}</span>
    </span>
  );
}

/** The printable A4 invoice (English + Arabic). Used in the app and on shared links. */
export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const { payment: p, settings: s } = data;
  const { lines, subtotal, discount } = invoiceLines(p);
  const refunded = p.status === "REFUNDED";
  const accent = s?.brandColor ?? "#6a44f2";
  const muted = "text-[#6e6a88]";

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-line bg-white p-8 text-[#15122b] shadow-xl sm:p-12 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {refunded && (
        <div className="pointer-events-none absolute top-16 right-[-40px] rotate-[25deg] border-4 border-rose-500 px-6 py-1 text-2xl font-black tracking-widest text-rose-500 opacity-70">REFUNDED</div>
      )}
      <div className="flex flex-col justify-between gap-6 sm:flex-row print:flex-row">
        <div>
          {s?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo} alt={s.name} className="h-14 max-w-[200px] object-contain" />
          ) : (
            <Logo className="!text-[#15122b]" />
          )}
          <p className="mt-3 text-sm font-semibold">{s?.legalName ?? s?.name}</p>
          {s?.address && <p className={`max-w-xs text-xs ${muted}`}>{s.address}</p>}
          <p className={`text-xs ${muted}`}>
            {s?.phone} {s?.email && `· ${s.email}`}
          </p>
          {s?.website && <p className={`text-xs ${muted}`}>{s.website}</p>}
          {s?.crNumber && (
            <p className={`text-xs ${muted}`}>
              <Bi l={L.cr} inline /> <span className="tabular-nums">{s.crNumber}</span>
            </p>
          )}
        </div>
        <div className="sm:text-right print:text-right">
          <p className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: accent }}>
            {L.title[0]} · {L.receipt[0]}
          </p>
          <p dir="rtl" lang="ar" className="text-sm font-bold" style={{ color: accent }}>
            {L.title[1]} / {L.receipt[1]}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold">{p.invoiceNo}</p>
          <p className={`mt-2 text-xs ${muted}`}>
            <Bi l={L.date} inline /> <span className="whitespace-nowrap">{formatDateTime(p.paidAt)}</span>
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 rounded-2xl bg-[#f5f2ff] p-5 sm:grid-cols-2 print:grid-cols-2">
        <div>
          <Bi l={L.billedTo} className={`text-[10px] font-bold tracking-[0.2em] uppercase ${muted}`} />
          {p.member ? (
            <>
              <p className="mt-1 font-semibold">{memberName(p.member)}</p>
              <p className={`text-xs ${muted}`}>
                {L.member[0]} {p.member.code}
              </p>
              <p className={`text-xs ${muted}`}>{p.member.phone}</p>
              {p.member.email && <p className={`text-xs ${muted}`}>{p.member.email}</p>}
              {p.member.qid && (
                <p className={`text-xs ${muted}`}>
                  {L.qid[0]} {p.member.qid}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 font-semibold">
              <Bi l={L.walkIn} inline />
            </p>
          )}
        </div>
        <div className="sm:text-right print:text-right">
          <Bi l={L.payment} className={`text-[10px] font-bold tracking-[0.2em] uppercase ${muted}`} />
          <p className="mt-1 font-semibold">
            <Bi l={METHOD[p.method] ?? [p.method, p.method]} inline />
          </p>
          {p.reference && (
            <p className={`text-xs ${muted}`}>
              {L.ref[0]} {p.reference}
            </p>
          )}
          {p.receivedBy && (
            <p className={`text-xs ${muted}`}>
              {L.receivedBy[0]} {p.receivedBy.name}
            </p>
          )}
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b-2 border-[#15122b] text-left text-[11px] tracking-wider uppercase">
            <th className="py-2 pr-3 align-bottom">
              <Bi l={L.description} />
            </th>
            <th className="w-14 py-2 text-center align-bottom">
              <Bi l={L.qty} />
            </th>
            <th className="w-28 py-2 text-right align-bottom">
              <Bi l={L.unit} />
            </th>
            <th className="w-28 py-2 text-right align-bottom">
              <Bi l={L.amount} />
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-[#e8e5f2]">
              <td className="py-4 pr-3">
                <p className="font-semibold">{l.title}</p>
                {l.detail && <p className={`text-xs ${muted}`}>{l.detail}</p>}
              </td>
              <td className="py-4 text-center tabular-nums">{l.qty}</td>
              <td className="py-4 text-right tabular-nums">{formatQAR(l.unit)}</td>
              <td className="py-4 text-right font-semibold tabular-nums">{formatQAR(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex flex-col-reverse justify-between gap-6 sm:flex-row print:flex-row">
        <div className="max-w-xs text-xs">
          <Bi l={L.inWords} className={`text-[10px] font-bold tracking-[0.2em] uppercase ${muted}`} />
          <p className="mt-1 font-medium">{amountInWords(p.amount)}</p>
        </div>
        <div className="w-full max-w-xs space-y-2 text-sm sm:ml-auto">
          <div className={`flex justify-between ${muted}`}>
            <Bi l={L.subtotal} />
            <span className="tabular-nums">{formatQAR(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className={`flex justify-between ${muted}`}>
              <Bi l={L.discount} />
              <span className="tabular-nums">− {formatQAR(discount)}</span>
            </div>
          )}
          <div className={`flex justify-between gap-3 ${muted}`}>
            <Bi l={L.vat} />
            <span className="text-right whitespace-nowrap">{L.vatNa[0]}</span>
          </div>
          <div className="flex justify-between border-t-2 border-[#15122b] pt-2 text-lg font-bold">
            <Bi l={refunded ? L.refunded : L.totalPaid} />
            <span className="tabular-nums">{formatQAR(p.amount)}</span>
          </div>
        </div>
      </div>

      <div className={`mt-12 space-y-1 border-t border-[#e8e5f2] pt-4 text-center text-xs ${muted}`}>
        {s?.invoiceFooter && <p>{s.invoiceFooter}</p>}
        <p>{L.thanks[0]}</p>
        <p dir="rtl" lang="ar">{L.thanks[1]}</p>
        <p className="pt-1 text-[10px]">{L.computer[0]}</p>
        <p dir="rtl" lang="ar" className="text-[10px]">
          {L.computer[1]}
        </p>
      </div>
      <p className="mt-4 text-center text-[10px] tracking-widest text-[#b7b2cc] uppercase">Powered by VOXI · {formatDate(new Date())}</p>
    </div>
  );
}
