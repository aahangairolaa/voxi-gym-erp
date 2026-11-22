/**
 * Hide member contact details from roles the owner hasn't allowed to see them.
 * "+974 5512 3456" → "+974 •••• 3456",  "olivia@mail.com" → "o••••@mail.com"
 */
export function maskPhone(v: string | null | undefined) {
  if (!v) return v ?? null;
  const digits = v.replace(/\D/g, "");
  const tail = digits.slice(-4);
  const code = v.trim().startsWith("+") ? (v.trim().match(/^\+\d{1,4}/)?.[0] ?? "") : "";
  return `${code ? code + " " : ""}•••• ${tail}`.trim();
}

export function maskEmail(v: string | null | undefined) {
  if (!v) return v ?? null;
  const [user, domain] = v.split("@");
  return `${(user ?? "").slice(0, 1)}••••@${domain ?? ""}`;
}

/** Mask phone, email and emergency phone on any member-like object (deeply, for lists). */
export function maskContacts<T>(value: T): T {
  if (Array.isArray(value)) return value.map(maskContacts) as T;
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if ((k === "phone" || k === "emergencyPhone") && typeof v === "string") out[k] = maskPhone(v);
    else if (k === "email" && typeof v === "string") out[k] = maskEmail(v);
    else out[k] = maskContacts(v);
  }
  return out as T;
}
