/**
 * How gyms reach the VOXI team (shown on the website, trial banner and help links).
 * Set on Vercel to change without editing code:
 *   NEXT_PUBLIC_CONTACT_EMAIL="hello@voxiai.co"   NEXT_PUBLIC_CONTACT_WHATSAPP="97455551234"
 */
export const CONTACT = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@voxiai.co",
  /** digits only, with country code — empty hides WhatsApp links */
  whatsapp: (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "").replace(/\D/g, ""),
  site: process.env.NEXT_PUBLIC_SITE_URL || "https://voxiai.co",
};
