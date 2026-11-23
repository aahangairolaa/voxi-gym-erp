/**
 * Send a member a message with files (invoice PDF, membership card, photos):
 *  - Email: through VOXI's email service, from "<Gym name> via VOXI", replies go to the gym.
 *  - WhatsApp: through the gym's WhatsApp Business API when it's connected.
 */
import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import { emailEnabled, sendEmail } from "../email";
import type { memberSendSchema } from "../validators";
import { audit } from "./audit.service";
import { fullName, ownedOr404 } from "./_shared";
import { sendFilesToMember } from "./whatsapp.service";

/** Emails each gym may send to members per day (keeps the shared sending quota safe). */
export const MEMBER_EMAILS_PER_DAY = 200;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const linkify = (s: string) => esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#6a44f2">${u}</a>`);

function gymEmail(gym: { name: string; brandColor: string | null; address: string | null; phone: string | null }, text: string, files: string[]) {
  const color = gym.brandColor ?? "#6a44f2";
  const paras = text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b2640">${linkify(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const list = files.length
    ? `<p style="margin:8px 0 0;font-size:13px;color:#8a86a3">Attached: ${files.map(esc).join(", ")}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f2fb;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fb;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:${esc(color)};padding:20px 28px;color:#ffffff;font-size:18px;font-weight:700">${esc(gym.name)}</td></tr>
<tr><td style="padding:28px">${paras}${list}</td></tr>
<tr><td style="border-top:1px solid #eeebf7;padding:16px 28px;font-size:12px;color:#a19db8">${esc([gym.name, gym.address, gym.phone].filter(Boolean).join(" · "))}<br>Sent with VOXI</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendToMemberWithFiles(session: GymSession, memberId: string, input: z.infer<typeof memberSendSchema>) {
  const member = ownedOr404(
    await db.member.findFirst({ where: { id: memberId, gymId: session.gymId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true } }),
    "Member",
  );
  const files = input.attachments.map((a) => ({ name: a.name, type: a.type, bytes: Buffer.from(a.data, "base64") }));
  const names = files.map((f) => f.name);

  if (input.channel === "WHATSAPP") {
    const r = await sendFilesToMember(session, member.id, input.text, files);
    await audit(session, "member.whatsapp_files", "Member", member.id, `WhatsApp to ${fullName(member)}${names.length ? ` with ${names.join(", ")}` : ""}`);
    return { channel: "WHATSAPP" as const, to: r.to };
  }

  if (!member.email) throw new ApiError(400, `${fullName(member)} has no email address. Add one on their profile first.`);
  if (!emailEnabled()) throw new ApiError(503, "Email isn't switched on for VOXI yet. Use WhatsApp for now.");
  const sentToday = await db.auditLog.count({ where: { gymId: session.gymId, action: "member.email", createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (sentToday >= MEMBER_EMAILS_PER_DAY) throw new ApiError(429, `You've sent ${MEMBER_EMAILS_PER_DAY} emails in the last 24 hours. Try again later or use WhatsApp.`);

  const gym = ownedOr404(await db.gym.findUnique({ where: { id: session.gymId }, select: { name: true, email: true, brandColor: true, address: true, phone: true } }), "Gym");
  const subject = input.subject?.trim() || `A message from ${gym.name}`;
  const ok = await sendEmail({
    to: member.email,
    subject,
    text: `${input.text.trim()}${names.length ? `\n\nAttached: ${names.join(", ")}` : ""}\n\n${gym.name}`,
    html: gymEmail(gym, input.text, names),
    attachments: input.attachments.map((a) => ({ filename: a.name, content: a.data })),
    fromName: `${gym.name} via VOXI`,
    replyTo: gym.email,
  });
  if (!ok) throw new ApiError(502, "The email couldn't be sent right now. Please try again in a minute.");
  await audit(session, "member.email", "Member", member.id, `Emailed ${fullName(member)}: "${subject}"${names.length ? ` with ${names.join(", ")}` : ""}`);
  return { channel: "EMAIL" as const, to: member.email };
}
