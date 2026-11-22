/**
 * Email verification codes: a 6-digit code is emailed and must be typed back.
 * Codes last 10 minutes, allow 5 tries, and each address can request 5 codes an hour.
 * Only an HMAC of the code is stored.
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { emailLayout, sendEmail } from "../email";
import { ApiError } from "../http";

export type CodePurpose = "signup" | "login";
const TTL_MIN = 10;
const MAX_TRIES = 5;
const MAX_PER_HOUR = 5;

const hash = (email: string, code: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "voxi-dev-secret").update(`${email.toLowerCase()}:${code}`).digest("hex");

export async function sendCode(email: string, purpose: CodePurpose, name?: string) {
  const to = email.toLowerCase();
  const recent = await db.emailCode.count({ where: { email: to, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
  if (recent >= MAX_PER_HOUR) throw new ApiError(429, "Too many codes requested. Please wait an hour and try again.");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Older codes for the same purpose stop working
  await db.emailCode.updateMany({ where: { email: to, purpose, usedAt: null }, data: { usedAt: new Date() } });
  await db.emailCode.create({ data: { email: to, purpose, codeHash: hash(to, code), expiresAt: new Date(Date.now() + TTL_MIN * 60_000) } });
  const first = name?.split(" ")[0];
  const heading = purpose === "signup" ? "Confirm your email" : "Your sign-in code";
  const intro = `${first ? `Hi ${first}, ` : ""}${purpose === "signup" ? "enter this code to finish creating your VOXI account." : "enter this code to confirm it's you signing in to VOXI."}`;
  const footer = `The code works for ${TTL_MIN} minutes. If you didn't ask for it, you can ignore this email.`;
  const ok = await sendEmail({
    to,
    subject: `${code} is your VOXI code`,
    text: `${heading}\n\n${intro}\n\n${code}\n\n${footer}`,
    html: emailLayout({ heading, intro, code, footer }),
  });
  if (!ok) throw new ApiError(502, "We couldn't send the email. Check the address and try again.");
}

/** Throws unless the code is right. Marks it used on success. */
export async function checkCode(email: string, purpose: CodePurpose, code: string) {
  const to = email.toLowerCase();
  const row = await db.emailCode.findFirst({ where: { email: to, purpose, usedAt: null }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt < new Date()) throw new ApiError(400, "That code has expired. Ask for a new one.");
  if (row.attempts >= MAX_TRIES) throw new ApiError(429, "Too many wrong codes. Ask for a new one.");
  const a = Buffer.from(row.codeHash, "hex");
  const b = Buffer.from(hash(to, code.trim()), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.emailCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_TRIES - row.attempts - 1;
    throw new ApiError(400, left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask for a new one.");
  }
  await db.emailCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
}
