/**
 * WhatsApp message texts. Each gym can edit these in Settings → WhatsApp.
 * Placeholders in {curly braces} are filled in for each member.
 *
 * With the WhatsApp Business API, messages a gym starts (reminders, birthdays …)
 * must use a template approved by Meta. Put the approved template's name in
 * `templateName` and list, in order, which placeholders fill its {{1}}, {{2}} …
 * in `params`. Without a template name, VOXI sends the text as a normal message
 * (Meta only delivers those within 24 hours of the member's last message).
 */
export type MessageType =
  | "RENEWAL_REMINDER"
  | "EXPIRED"
  | "WELCOME"
  | "PAYMENT_RECEIPT"
  | "BIRTHDAY"
  | "MILESTONE"
  | "CARD"
  | "CUSTOM";

export type TemplateConfig = {
  text: string;
  templateName?: string | null;
  language?: string | null; // Meta language code, e.g. "en" or "ar"
  params?: string | null; // comma-separated placeholder names, e.g. "firstName,plan,endDate"
};

export const MESSAGE_TYPES: { type: MessageType; label: string; description: string }[] = [
  { type: "RENEWAL_REMINDER", label: "Renewal reminder", description: "Membership ends soon" },
  { type: "EXPIRED", label: "Expired, come back", description: "Membership has ended" },
  { type: "WELCOME", label: "Welcome", description: "New member joined" },
  { type: "PAYMENT_RECEIPT", label: "Payment receipt", description: "After a payment" },
  { type: "BIRTHDAY", label: "Birthday wishes", description: "On the member's birthday" },
  { type: "MILESTONE", label: "Visit milestone", description: "e.g. 50th visit" },
  { type: "CARD", label: "Digital card", description: "Link to the member's QR card" },
  { type: "CUSTOM", label: "Custom message", description: "Write your own" },
];

export const DEFAULT_TEMPLATES: Record<MessageType, TemplateConfig> = {
  RENEWAL_REMINDER: {
    text: "Hi {firstName}, your {plan} membership at {gym} ends on {endDate} ({daysLeft} days left). Renew at reception or reply here so your training continues without a break.",
    params: "firstName,plan,gym,endDate",
  },
  EXPIRED: {
    text: "Hi {firstName}, we miss you at {gym}! Your {plan} membership ended on {endDate}. Reply to this message and we'll get you back on track this week.",
    params: "firstName,gym,plan,endDate",
  },
  WELCOME: {
    text: "Welcome to {gym}, {firstName}. Your member number is {code}. Your digital member card (show the QR at reception): {cardUrl}",
    params: "gym,firstName,code,cardUrl",
  },
  PAYMENT_RECEIPT: {
    text: "Thank you {firstName}! {gym} received QAR {amount} for {description} (receipt {invoiceNo}).",
    params: "firstName,gym,amount,description,invoiceNo",
  },
  BIRTHDAY: {
    text: "Happy birthday, {firstName}! Everyone at {gym} wishes you a strong and healthy year ahead.",
    params: "firstName,gym",
  },
  MILESTONE: {
    text: "Amazing work, {firstName}! You've just reached {visits} visits at {gym}. Keep it going!",
    params: "firstName,visits,gym",
  },
  CARD: {
    text: "Hi {firstName}, here is your {gym} digital member card: {cardUrl}. Show the QR code at reception to check in.",
    params: "firstName,gym,cardUrl",
  },
  CUSTOM: { text: "{text}", params: "text" },
};

export const PLACEHOLDERS = [
  "firstName", "name", "gym", "code", "plan", "endDate", "daysLeft", "cardUrl", "visits", "amount", "invoiceNo", "description", "text",
] as const;

/** Replace {placeholders} with values; unknown ones are left empty. */
export function fillTemplate(text: string, vars: Record<string, string | number | null | undefined>) {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

/** Qatar-friendly phone → international digits: "5512 3456" → "97455123456". */
export function toWhatsAppNumber(phone: string) {
  let d = phone.replace(/[^\d]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 8) d = `974${d}`; // local Qatar number
  return d;
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;
}
