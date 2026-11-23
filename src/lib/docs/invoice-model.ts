/**
 * Everything an invoice shows, worked out once and used by the printable page,
 * the PDF and the shared link. Labels are bilingual (English + Arabic): Qatar's
 * consumer protection rules require invoices to consumers to include Arabic.
 */
import { formatDate, formatQAR } from "@/lib/format";

export type InvoicePayment = {
  id: string;
  invoiceNo: string;
  amount: number;
  method: string;
  status: string;
  description: string | null;
  reference: string | null;
  paidAt: string;
  quantity: number | null;
  member: { id?: string; code: string; firstName: string; lastName: string; phone: string; email: string | null; qid: string | null } | null;
  membership: { startDate: string; endDate: string; price: number; discount: number; plan: { name: string } } | null;
  receivedBy: { name: string } | null;
  ptPackage: { name: string; sessionsTotal: number; trainer: { name: string } | null } | null;
  extraItem: { name: string; price: number } | null;
};
export type InvoiceGym = {
  name: string;
  legalName: string | null;
  crNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  logo: string | null;
  brandColor: string | null;
  invoiceFooter: string | null;
};
export type InvoiceData = { payment: InvoicePayment; settings: InvoiceGym | null; shareToken?: string };

export const L = {
  title: ["Invoice", "فاتورة"],
  receipt: ["Paid receipt", "إيصال دفع"],
  invoiceNo: ["Invoice No.", "رقم الفاتورة"],
  date: ["Date", "التاريخ"],
  cr: ["CR No.", "السجل التجاري"],
  billedTo: ["Billed to", "العميل"],
  walkIn: ["Walk-in customer", "عميل زائر"],
  member: ["Member No.", "رقم العضوية"],
  qid: ["QID", "رقم البطاقة الشخصية"],
  phone: ["Phone", "الهاتف"],
  payment: ["Payment", "طريقة الدفع"],
  ref: ["Reference", "المرجع"],
  receivedBy: ["Received by", "استلمها"],
  description: ["Description", "الوصف"],
  qty: ["Qty", "الكمية"],
  unit: ["Unit price", "سعر الوحدة"],
  amount: ["Amount", "المبلغ"],
  subtotal: ["Subtotal", "المجموع الفرعي"],
  discount: ["Discount", "الخصم"],
  vat: ["VAT", "ضريبة القيمة المضافة"],
  vatNa: ["Not applicable", "غير مطبقة"],
  totalPaid: ["Total paid", "المبلغ المدفوع"],
  refunded: ["Refunded", "مُسترد"],
  inWords: ["Amount in words", "المبلغ كتابةً"],
  thanks: ["Thank you for training with us.", "شكراً لتدريبكم معنا"],
  computer: ["This is a computer-generated invoice and needs no signature.", "هذه فاتورة إلكترونية ولا تحتاج إلى توقيع"],
} as const;

export const METHOD: Record<string, readonly [string, string]> = {
  CASH: ["Cash", "نقداً"],
  CARD: ["Card", "بطاقة"],
  BANK_TRANSFER: ["Bank transfer", "تحويل بنكي"],
  FAWRAN: ["Fawran", "فورًا"],
  ONLINE: ["Online", "دفع إلكتروني"],
};

export type InvoiceLine = { title: string; detail: string | null; qty: number; unit: number; amount: number };

/** The invoice's line(s), with quantity and unit price where they're known. */
export function invoiceLines(p: InvoicePayment): { lines: InvoiceLine[]; subtotal: number; discount: number } {
  if (p.membership) {
    const ms = p.membership;
    const full = ms.price - ms.discount;
    // Paying the whole plan: show the plan price and the discount. Paying part of it: show the part.
    if (ms.discount > 0 && p.amount === full) {
      return {
        lines: [{ title: p.description ?? `${ms.plan.name} membership`, detail: `${formatDate(ms.startDate)} – ${formatDate(ms.endDate)}`, qty: 1, unit: ms.price, amount: ms.price }],
        subtotal: ms.price,
        discount: ms.discount,
      };
    }
    const part = p.amount !== full;
    return {
      lines: [
        {
          title: p.description ?? `${ms.plan.name} membership`,
          detail: `${formatDate(ms.startDate)} – ${formatDate(ms.endDate)}${part ? ` · plan total ${formatQAR(full)}` : ""}`,
          qty: 1,
          unit: p.amount,
          amount: p.amount,
        },
      ],
      subtotal: p.amount,
      discount: 0,
    };
  }
  if (p.ptPackage) {
    const t = p.ptPackage.trainer?.name;
    return {
      lines: [{ title: p.description ?? p.ptPackage.name, detail: `${p.ptPackage.sessionsTotal} personal training sessions${t ? ` with ${t}` : ""}`, qty: 1, unit: p.amount, amount: p.amount }],
      subtotal: p.amount,
      discount: 0,
    };
  }
  if (p.extraItem && p.quantity && p.quantity > 0 && p.amount % p.quantity === 0) {
    return { lines: [{ title: p.extraItem.name, detail: p.description && p.description !== p.extraItem.name ? p.description : null, qty: p.quantity, unit: p.amount / p.quantity, amount: p.amount }], subtotal: p.amount, discount: 0 };
  }
  return { lines: [{ title: p.description ?? "Payment", detail: null, qty: 1, unit: p.amount, amount: p.amount }], subtotal: p.amount, discount: 0 };
}

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function words(n: number): string {
  if (n < 20) return ONES[n]!;
  if (n < 100) return TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ""}`;
  for (const [size, name] of [[1_000_000_000, "billion"], [1_000_000, "million"], [1000, "thousand"]] as const) {
    if (n >= size) return `${words(Math.floor(n / size))} ${name}${n % size ? `${n % size < 100 ? " and" : ""} ${words(n % size)}` : ""}`;
  }
  return String(n);
}

/** 1550 → "One thousand five hundred and fifty Qatari Riyals only" */
export function amountInWords(amount: number) {
  const n = Math.round(Math.abs(amount));
  const w = n === 0 ? "zero" : words(n);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} Qatari Riyal${n === 1 ? "" : "s"} only`;
}

export const memberName = (m: InvoicePayment["member"]) => (m ? `${m.firstName} ${m.lastName}`.trim() : "");
