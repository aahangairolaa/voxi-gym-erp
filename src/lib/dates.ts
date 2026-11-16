/**
 * Date helpers that work in Qatar time (UTC+3, no daylight saving).
 * They are used by BOTH the browser and the server, so "today" always
 * means "today in Doha" no matter where the server is hosted (Vercel runs in UTC).
 */
export const QATAR_TZ = "Asia/Qatar";
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date = new Date()): Date {
  const local = d.getTime() + OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - OFFSET_MS);
}

export function endOfDay(d: Date = new Date()): Date {
  return new Date(startOfDay(d).getTime() + DAY_MS - 1);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** Qatar-local year/month/day/hour/weekday of a date. */
export function qatarParts(d: Date) {
  const l = new Date(d.getTime() + OFFSET_MS);
  return {
    year: l.getUTCFullYear(),
    month: l.getUTCMonth(), // 0-11
    day: l.getUTCDate(),
    hour: l.getUTCHours(),
    weekday: l.getUTCDay(), // 0 = Sunday
  };
}

export function startOfMonth(d: Date = new Date()): Date {
  const { year, month } = qatarParts(d);
  return new Date(Date.UTC(year, month, 1) - OFFSET_MS);
}

export function addMonths(d: Date, months: number): Date {
  const { year, month } = qatarParts(d);
  return new Date(Date.UTC(year, month + months, 1) - OFFSET_MS);
}

export function startOfWeek(d: Date = new Date()): Date {
  // Week starts on Saturday? Most Qatar gyms use Sunday → Saturday. We use Sunday.
  const { weekday } = qatarParts(d);
  return startOfDay(addDays(d, -weekday));
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** "2026-11-12" (Qatar local) — handy for <input type="date"> values. */
export function toDateInput(d: Date = new Date()): string {
  const { year, month, day } = qatarParts(d);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse "2026-11-12" from a date input as midnight Qatar time. */
export function fromDateInput(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!) - OFFSET_MS);
}

export function monthKey(d: Date): string {
  const { year, month } = qatarParts(d);
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
