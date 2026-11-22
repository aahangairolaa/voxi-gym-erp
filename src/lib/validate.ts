/**
 * Field rules shared by the forms (instant feedback) and the API (final say).
 * Every function returns an error message, or null when the value is fine.
 */
import { splitPhone } from "@/lib/countries";

// ── Phone ────────────────────────────────────────────────────────────────────
/** Digits after the country code: [min, max]. Countries not listed use a general rule. */
export const PHONE_DIGITS: Record<string, [number, number]> = {
  "974": [8, 8], // Qatar
  "966": [9, 9], // Saudi Arabia
  "971": [8, 9], // UAE (mobiles 9, landlines 8)
  "965": [8, 8], // Kuwait
  "973": [8, 8], // Bahrain
  "968": [8, 8], // Oman
  "91": [10, 10], // India
  "92": [10, 10], // Pakistan
  "63": [10, 10], // Philippines
  "20": [10, 10], // Egypt
  "977": [8, 10], // Nepal
  "94": [9, 9], // Sri Lanka
  "880": [10, 10], // Bangladesh
  "962": [8, 9], // Jordan
  "961": [7, 8], // Lebanon
  "44": [10, 10], // United Kingdom
  "1": [10, 10], // US / Canada
  "61": [9, 9], // Australia
  "33": [9, 9], // France
  "49": [10, 11], // Germany
};
const GENERAL_DIGITS: [number, number] = [6, 13];

export function phoneDigitsFor(dial: string): [number, number] {
  return PHONE_DIGITS[dial] ?? GENERAL_DIGITS;
}

/** "8 digits" or "9 to 10 digits" */
export function phoneDigitsLabel(dial: string) {
  const [min, max] = phoneDigitsFor(dial);
  return min === max ? `${min} digits` : `${min} to ${max} digits`;
}

/** value is what PhoneInput stores, e.g. "+974 5512 3456". */
export function phoneError(value: string | null | undefined, required = true): string | null {
  const v = (value ?? "").trim();
  const [dial, rest] = splitPhone(v);
  if (!rest.trim()) return required ? "Mobile number is required" : null;
  if (/[^\d\s-]/.test(rest)) return "Use numbers only";
  let digits = rest.replace(/\D/g, "");
  // People often type the local trunk 0 (e.g. 07911 123456 in the UK); it is not dialled with the country code
  if (digits.length > 1 && digits.startsWith("0") && dial !== "974") digits = digits.slice(1);
  const [min, max] = phoneDigitsFor(dial);
  if (digits.length < min || digits.length > max) return `Enter a valid number: ${phoneDigitsLabel(dial)} after +${dial}`;
  if (/^(\d)\1+$/.test(digits)) return "Enter a real mobile number";
  return null;
}

/** Tidy a valid phone for saving: "+974 55123456". */
export function normalizePhone(value: string) {
  const [dial, rest] = splitPhone(value.trim());
  let digits = rest.replace(/\D/g, "");
  if (digits.length > 1 && digits.startsWith("0") && dial !== "974") digits = digits.slice(1);
  return `+${dial} ${digits}`;
}

// ── Email ────────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9_%+-])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

export function emailError(value: string | null | undefined, required = true): string | null {
  const v = (value ?? "").trim();
  if (!v) return required ? "Email is required" : null;
  if (/\s/.test(v)) return "An email can't contain spaces";
  if (v.length > 254 || !EMAIL_RE.test(v) || v.includes("..")) return "Enter a valid email, like name@example.com";
  return null;
}

// ── Names ────────────────────────────────────────────────────────────────────
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’. -]*$/u;

export function nameError(value: string | null | undefined, what = "Name", required = true): string | null {
  const v = (value ?? "").trim();
  if (!v) return required ? `${what} is required` : null;
  if (v.length < 2 && !/^\p{Script=Han}$/u.test(v)) return `${what} is too short`;
  if (v.length > 60) return `${what} is too long`;
  if (!NAME_RE.test(v)) return `${what} can only contain letters`;
  return null;
}

// ── Date of birth ────────────────────────────────────────────────────────────
export const MIN_AGE = 10;
export const MAX_AGE = 100;

/** Age in whole years on `today` for a "YYYY-MM-DD" birthday. */
export function ageOn(dob: string, today = new Date()) {
  const [y, m, d] = dob.split("-").map(Number) as [number, number, number];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

/** value is "YYYY-MM-DD" from a date input. */
export function dobError(value: string | null | undefined, required = true): string | null {
  const v = (value ?? "").trim().slice(0, 10);
  if (!v) return required ? "Date of birth is required" : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(new Date(v).getTime())) return "Enter a valid date";
  const age = ageOn(v);
  if (age < 0) return "Date of birth can't be in the future";
  if (age < MIN_AGE) return `Members must be at least ${MIN_AGE} years old`;
  if (age > MAX_AGE) return "Check the year of birth";
  return null;
}

/** Bounds for <input type="date"> so the picker only offers valid birthdays. */
export function dobBounds(today = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (y: number) => `${y}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return { max: fmt(today.getFullYear() - MIN_AGE), min: fmt(today.getFullYear() - MAX_AGE - 1) };
}

// ── Other IDs ────────────────────────────────────────────────────────────────
export function qidError(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!/^\d{11}$/.test(v)) return "QID must be exactly 11 digits";
  return null;
}

export function websiteError(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,24}(\/\S*)?$/i.test(v)) return "Enter a website like yourgym.qa";
  return null;
}

export function passwordError(value: string | null | undefined): string | null {
  const v = value ?? "";
  if (!v) return "Choose a password";
  if (v.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return "Use letters and at least one number";
  return null;
}

/** Run a set of checks; returns only the fields with problems. */
export function collectErrors(checks: Record<string, string | null>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(checks)) if (v) out[k] = v;
  return out;
}
