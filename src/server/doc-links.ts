/**
 * Shareable document links (e.g. an invoice sent to a member on WhatsApp).
 * The token is the record id plus a short HMAC signature, so links can't be
 * guessed or changed to open someone else's invoice. Changing AUTH_SECRET
 * makes old links stop working.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.AUTH_SECRET || "voxi-dev-only-secret-change-me-please";
const sig = (kind: string, id: string) => createHmac("sha256", `voxi-docs:${secret()}`).update(`${kind}:${id}`).digest("base64url").slice(0, 22);

export function signDoc(kind: "inv", id: string) {
  return `${id}.${sig(kind, id)}`;
}

/** Returns the id if the token is genuine, otherwise null. */
export function verifyDoc(kind: "inv", token: string): string | null {
  const [id, s] = token.split(".");
  if (!id || !s || id.length > 40) return null;
  const want = Buffer.from(sig(kind, id));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}
