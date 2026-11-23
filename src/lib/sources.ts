/**
 * Where a lead or member came from. Used by leads, the member form ("How did they find us?")
 * and the Sales page. Order = order shown in lists.
 */
export const SOURCES = [
  "WALK_IN",
  "WHATSAPP",
  "INSTAGRAM",
  "REFERRAL",
  "PHONE_CALL",
  "GOOGLE",
  "WEBSITE",
  "FACEBOOK",
  "TIKTOK",
  "CORPORATE",
  "OTHER",
] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABEL: Record<Source, string> = {
  WALK_IN: "Walk-in",
  WHATSAPP: "WhatsApp lead",
  INSTAGRAM: "Instagram",
  REFERRAL: "Referral (friend or member)",
  PHONE_CALL: "Phone call",
  GOOGLE: "Google search or Maps",
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  CORPORATE: "Corporate deal",
  OTHER: "Other",
};

/** Short labels for tabs and chips */
export const SOURCE_SHORT: Record<Source, string> = {
  WALK_IN: "Walk-in",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  REFERRAL: "Referral",
  PHONE_CALL: "Phone",
  GOOGLE: "Google",
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  CORPORATE: "Corporate",
  OTHER: "Other",
};

/** Turn what people type in a spreadsheet ("whatsapp", "Walk in", "IG") into a source. */
export function parseSource(raw: string | null | undefined): Source | null {
  const v = (raw ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!v) return null;
  const map: Record<string, Source> = {
    walkin: "WALK_IN", walk: "WALK_IN", visit: "WALK_IN",
    whatsapp: "WHATSAPP", wa: "WHATSAPP", whatsapplead: "WHATSAPP",
    instagram: "INSTAGRAM", insta: "INSTAGRAM", ig: "INSTAGRAM",
    referral: "REFERRAL", friend: "REFERRAL", referred: "REFERRAL",
    phone: "PHONE_CALL", phonecall: "PHONE_CALL", call: "PHONE_CALL",
    google: "GOOGLE", maps: "GOOGLE", googlemaps: "GOOGLE",
    website: "WEBSITE", web: "WEBSITE", site: "WEBSITE",
    facebook: "FACEBOOK", fb: "FACEBOOK",
    tiktok: "TIKTOK",
    corporate: "CORPORATE", company: "CORPORATE",
    other: "OTHER",
  };
  return map[v] ?? (SOURCES.find((s) => s.toLowerCase().replace(/_/g, "") === v) ?? "OTHER");
}
