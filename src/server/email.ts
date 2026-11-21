/**
 * Sending emails (password resets). Uses Resend (resend.com) when these are set:
 *   RESEND_API_KEY="re_..."   EMAIL_FROM="VOXI <no-reply@voxiai.co>"
 * Without them, email features turn off gracefully.
 */
export function emailEnabled() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (!emailEnabled()) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
  }).catch(() => null);
  if (!res?.ok) console.error("[email] sending failed", res?.status);
  return !!res?.ok;
}
