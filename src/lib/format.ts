import { QATAR_TZ } from "./dates";

const qar = new Intl.NumberFormat("en-QA", { maximumFractionDigits: 0 });

/** 12500 → "QAR 12,500" */
export function formatQAR(amount: number | null | undefined) {
  return `QAR ${qar.format(amount ?? 0)}`;
}

/** 12500 → "12.5K" — for compact chart labels */
export function compactNumber(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatNumber(n: number) {
  return qar.format(n);
}

type DateLike = string | Date | null | undefined;
const toDate = (d: DateLike) => (d ? new Date(d) : null);

/** "12 Nov 2026" */
export function formatDate(d: DateLike) {
  const date = toDate(d);
  if (!date) return "–";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: QATAR_TZ });
}

/** "12 Nov" */
export function formatShortDate(d: DateLike) {
  const date = toDate(d);
  if (!date) return "–";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: QATAR_TZ });
}

/** "7:45 PM" */
export function formatTime(d: DateLike) {
  const date = toDate(d);
  if (!date) return "–";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: QATAR_TZ });
}

/** "12 Nov, 7:45 PM" */
export function formatDateTime(d: DateLike) {
  const date = toDate(d);
  if (!date) return "–";
  return `${formatShortDate(date)}, ${formatTime(date)}`;
}

/** "3 min ago", "in 5 days" */
export function timeAgo(d: DateLike) {
  const date = toDate(d);
  if (!date) return "–";
  const diff = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
}

/** "BANK_TRANSFER" → "Bank transfer" */
export function humanize(value: string | null | undefined) {
  if (!value) return "–";
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function durationLabel(days: number) {
  if (days % 365 === 0) return days === 365 ? "1 year" : `${days / 365} years`;
  if (days % 30 === 0) return days === 30 ? "1 month" : `${days / 30} months`;
  if (days % 7 === 0) return days === 7 ? "1 week" : `${days / 7} weeks`;
  return `${days} days`;
}
