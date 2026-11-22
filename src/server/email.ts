/**
 * Sending emails (sign-up codes, password resets) through Resend (resend.com).
 *   RESEND_API_KEY="re_..."                         (required to switch email on)
 *   EMAIL_FROM="VOXI <no-reply@voxiai.co>"          (optional, this is the default)
 *   EMAIL_REPLY_TO="support@voxiai.co"              (optional, this is the default)
 * Without a key, email features turn off gracefully.
 */
export function emailEnabled() {
  return !!process.env.RESEND_API_KEY || devLog();
}
/** Local testing only: EMAIL_DEV_LOG=1 prints emails to the server log instead of sending them. */
const devLog = () => process.env.EMAIL_DEV_LOG === "1" && !process.env.VERCEL;

const FROM = () => process.env.EMAIL_FROM || "VOXI <no-reply@voxiai.co>";
const REPLY_TO = () => process.env.EMAIL_REPLY_TO || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@voxiai.co";

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  if (!emailEnabled()) return false;
  if (!process.env.RESEND_API_KEY && devLog()) {
    console.log(`[email-dev] to=${to} subject=${subject}`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), to: [to], reply_to: REPLY_TO(), subject, text, ...(html ? { html } : {}) }),
  }).catch(() => null);
  if (!res?.ok) console.error("[email] sending failed", res?.status, await res?.text().catch(() => ""));
  return !!res?.ok;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A simple, branded email layout that renders well in Gmail, Outlook and Apple Mail. */
export function emailLayout({ heading, intro, code, button, footer }: { heading: string; intro: string; code?: string; button?: { label: string; url: string }; footer: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f2fb;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1b1530">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fb;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#120c30;padding:22px 28px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:6px">VOXI</td></tr>
<tr><td style="padding:32px 28px 8px">
<h1 style="margin:0 0 10px;font-size:22px;line-height:1.3">${esc(heading)}</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5b5675">${esc(intro)}</p>
${code ? `<div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;background:#f1edff;color:#2d1a6e;border-radius:14px;padding:18px 0;margin:0 0 22px">${esc(code)}</div>` : ""}
${button ? `<p style="text-align:center;margin:0 0 22px"><a href="${esc(button.url)}" style="display:inline-block;background:#6a44f2;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 26px;border-radius:12px">${esc(button.label)}</a></p>` : ""}
<p style="margin:0 0 28px;font-size:13px;line-height:1.6;color:#8a86a3">${esc(footer)}</p>
</td></tr>
<tr><td style="border-top:1px solid #eeebf7;padding:16px 28px;font-size:12px;color:#a19db8">VOXI · Gym management for Qatar · voxiai.co</td></tr>
</table></td></tr></table></body></html>`;
}
