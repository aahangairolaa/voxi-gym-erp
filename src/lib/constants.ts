/** Labels and colours for values stored in the database. */

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card (POS)" },
  { value: "FAWRAN", label: "Fawran" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "ONLINE", label: "Online link" },
] as const;

export const LEAD_SOURCES = [
  { value: "WALK_IN", label: "Walk-in" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "OTHER", label: "Other" },
] as const;

export const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "TRIAL", label: "Trial booked" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
] as const;

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Equipment",
  "Maintenance",
  "Marketing",
  "Supplies",
  "Other",
] as const;

export const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full body", "Cardio"] as const;

export const NATIONALITIES = [
  "Qatari", "Indian", "Egyptian", "Filipino", "Pakistani", "British", "Lebanese", "Jordanian",
  "Syrian", "Sudanese", "Nepali", "Sri Lankan", "American", "Other",
] as const;

/** Visual tone for each member status badge */
export type MemberStatus = "ACTIVE" | "EXPIRING" | "FROZEN" | "EXPIRED" | "NONE";
export const MEMBER_STATUS: Record<MemberStatus, { label: string; tone: "green" | "amber" | "blue" | "red" | "gray" }> = {
  ACTIVE: { label: "Active", tone: "green" },
  EXPIRING: { label: "Expiring", tone: "amber" },
  FROZEN: { label: "Frozen", tone: "blue" },
  EXPIRED: { label: "Expired", tone: "red" },
  NONE: { label: "No plan", tone: "gray" },
};
