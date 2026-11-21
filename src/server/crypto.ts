/**
 * Encrypt small secrets (e.g. a gym's WhatsApp access token) before saving them.
 * AES-256-GCM with a key derived from AUTH_SECRET — so a database leak alone
 * doesn't expose the tokens. If you change AUTH_SECRET, re-enter the tokens.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env.AUTH_SECRET || "voxi-dev-only-secret-change-me-please";
  return createHash("sha256").update(`voxi-secrets:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decryptSecret(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    const [v, iv, tag, data] = enc.split(".");
    if (v !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function randomToken(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}
