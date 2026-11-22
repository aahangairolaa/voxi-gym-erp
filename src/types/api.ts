/**
 * Shapes of the JSON the API returns — so the frontend gets autocomplete.
 * Dates arrive as ISO strings over JSON.
 */
import type { MemberStatus } from "@/lib/constants";
import type { Role } from "@/lib/permissions";

type ISODate = string;

export type SearchResult = { id: string; code: string; name: string; phone: string; status: MemberStatus; plan: string | null; photoUrl?: string | null };

export type Branch = { id: string; name: string; address: string | null; phone: string | null; isActive: boolean; _count?: { members: number; staff: number } };

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: number;
  sessions: number | null;
  freezeDays: number;
  features: string[];
  color: string;
  isActive: boolean;
  sortOrder: number;
  activeMembers: number;
};

export type MemberRow = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  gender: "MALE" | "FEMALE" | null;
  branch: { id: string; name: string } | null;
  biometricId: string | null;
  photoUrl: string | null;
  createdAt: ISODate;
  status: MemberStatus;
  plan: { id: string; name: string; color: string } | null;
  endDate: ISODate | null;
  daysLeft: number | null;
};
export type MembersResponse = { members: MemberRow[]; counts: Record<MemberStatus | "ALL", number> };

export type MembershipDetail = {
  id: string;
  planId: string;
  plan: Plan;
  startDate: ISODate;
  endDate: ISODate;
  status: "ACTIVE" | "FROZEN" | "EXPIRED" | "CANCELLED";
  effectiveStatus: MemberStatus;
  price: number;
  discount: number;
  paid: number;
  balance: number;
  frozenAt: ISODate | null;
  freezeDaysUsed: number;
};

export type MemberDetail = {
  id: string;
  code: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  gender: "MALE" | "FEMALE" | null;
  dateOfBirth: ISODate | null;
  qid: string | null;
  nationality: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  biometricId: string | null;
  biometricEnrolled: ISODate | null;
  photoUrl: string | null;
  qrToken: string;
  createdAt: ISODate;
  status: MemberStatus;
  currentMembership: MembershipDetail | null;
  memberships: MembershipDetail[];
  payments: { id: string; invoiceNo: string; amount: number; method: string; status: string; description: string | null; paidAt: ISODate; receivedBy: { name: string } | null }[];
  attendance: { id: string; checkInAt: ISODate; checkOutAt: ISODate | null; source: string; branch: { name: string } | null }[];
  workoutPlans: { id: string; name: string; goal: string | null; level: string | null; trainer: { name: string } | null; _count: { items: number } }[];
  workoutLogs: { id: string; durationMin: number; calories: number | null; loggedAt: ISODate }[];
  bookings: { id: string; status: string; gymClass: { name: string; startsAt: ISODate } }[];
  messages: { id: string; type: MessageType; channel: "API" | "LINK"; status: MessageStatus; createdAt: ISODate }[];
  stats: { totalVisits: number; visitsThisMonth: number; totalPaid: number; outstanding: number; lastVisit: ISODate | null };
};

export type MembershipRow = {
  id: string;
  member: { id: string; code: string; name: string; phone: string };
  plan: { id: string; name: string; color: string; freezeDays: number };
  startDate: ISODate;
  endDate: ISODate;
  status: MemberStatus | "CANCELLED";
  daysLeft: number;
  price: number;
  discount: number;
  paid: number;
  balance: number;
  freezeDaysUsed: number;
  frozenAt: ISODate | null;
};
export type MembershipsResponse = {
  memberships: MembershipRow[];
  summary: { active: number; expiring: number; frozen: number; outstanding: number };
};

export type PaymentRow = {
  id: string;
  invoiceNo: string;
  amount: number;
  method: string;
  status: string;
  description: string | null;
  reference: string | null;
  paidAt: ISODate;
  member: { id: string; code: string; name: string } | null;
  receivedBy: string | null;
};
export type PaymentsResponse = {
  payments: PaymentRow[];
  totals: { collected: number; refunded: number; count: number; byMethod: Record<string, number> };
};

export type DashboardData = {
  kpis: {
    activeMembers: number;
    frozenMembers: number;
    totalMembers: number;
    newMembers: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueChange: number | null;
    todayVisits: number;
    insideNow: number;
    expiringSoon: number;
    openLeads: number;
  };
  revenueByMonth: { label: string; value: number }[];
  visitsByDay: { label: string; value: number }[];
  planMix: { name: string; color: string; value: number }[];
  expiring: { memberId: string; name: string; code: string; phone: string; plan: string; endDate: ISODate; daysLeft: number }[];
  recentPayments: { id: string; invoiceNo: string; amount: number; method: string; status: string; paidAt: ISODate; member: { id: string; name: string } | null; description: string | null }[];
  recentVisits: { id: string; checkInAt: ISODate; checkOutAt: ISODate | null; source: string; member: { id: string; code: string; name: string; photoUrl?: string | null } }[];
  classesToday: { id: string; name: string; startsAt: ISODate; durationMin: number; trainer: string | null; booked: number; capacity: number; room: string | null }[];
};

export type AccessResult = {
  allowed: boolean;
  action: "IN" | "OUT" | "DENIED";
  reason: string | null;
  member: { id: string; code: string; name: string; status: string; plan: string | null; endDate: ISODate | null; photoUrl: string | null };
  attendanceId: string | null;
};

export type AttendanceResponse = {
  visits: { id: string; member: { id: string; code: string; name: string; photoUrl: string | null }; branch: string | null; checkInAt: ISODate; checkOutAt: ISODate | null; source: string; device: string | null }[];
  stats: { total: number; inside: number; avgMinutes: number; biometric: number };
  byHour: number[];
};

export type Device = {
  id: string;
  name: string;
  type: "FINGERPRINT" | "FACE" | "CARD" | "PALM";
  vendor: string | null;
  serialNumber: string;
  apiKeyHint: string;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  isActive: boolean;
  lastSeenAt: ISODate | null;
  scans24h: number;
  online: boolean;
};

export type BiometricEvent = {
  id: string;
  device: string;
  biometricUserId: string;
  member: { id: string; code: string; name: string } | null;
  result: "GRANTED_IN" | "GRANTED_OUT" | "DENIED" | "UNKNOWN_USER";
  reason: string | null;
  scannedAt: ISODate;
};

export type Exercise = { id: string; name: string; muscleGroup: string; equipment: string | null };
export type WorkoutPlan = {
  id: string;
  name: string;
  goal: string | null;
  level: string | null;
  description: string | null;
  daysPerWeek: number;
  trainer: { id: string; name: string } | null;
  member: { id: string; code: string; name: string } | null;
  items: { id: string; day: number; sets: number; reps: string; restSeconds: number; exerciseId: string; exercise: Exercise }[];
  _count: { logs: number };
  createdAt: ISODate;
};
export type WorkoutLog = { id: string; member: { id: string; code: string; name: string }; plan: string | null; durationMin: number; calories: number | null; notes: string | null; loggedAt: ISODate };

export type GymClass = {
  id: string;
  name: string;
  description: string | null;
  room: string | null;
  startsAt: ISODate;
  durationMin: number;
  capacity: number;
  booked: number;
  trainerId: string | null;
  branchId: string | null;
  trainer: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  bookings: { id: string; status: string; member: { id: string; code: string; name: string } }[];
};

export type LeaderboardResponse = {
  period: "week" | "month" | "all";
  points: { visit: number; workout: number; per10Min: number };
  entries: { rank: number; memberId: string; member: { id: string; code: string; name: string; gender: string | null; photoUrl: string | null }; visits: number; workouts: number; minutes: number; points: number }[];
};

export type CashSession = {
  id: string;
  branchId: string;
  branch: { id: string; name: string };
  status: "OPEN" | "CLOSED";
  openingFloat: number;
  expectedCash: number | null;
  countedCash: number | null;
  difference: number | null;
  notes: string | null;
  openedBy: string;
  closedBy: string | null;
  openedAt: ISODate;
  closedAt: ISODate | null;
  totals: { cashIn: number; cashOut: number; refunded: number; transactions: number; expected: number };
};

export type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  method: string;
  spentAt: ISODate;
  branch: string | null;
  createdBy: string | null;
};

export type ReportData = {
  range: { from: ISODate; to: ISODate };
  totals: { revenue: number; expenses: number; net: number; newMembers: number; visits: number; uniqueVisitors: number; membershipsSold: number };
  months: { label: string; revenue: number; expenses: number; newMembers: number }[];
  byMethod: { label: string; value: number }[];
  byPlan: { label: string; value: number }[];
  byCategory: { label: string; value: number }[];
  planSales: { label: string; color: string; value: number }[];
  heatmap: number[][];
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  status: "NEW" | "CONTACTED" | "TRIAL" | "CONVERTED" | "LOST";
  interest: string | null;
  notes: string | null;
  followUpAt: ISODate | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  convertedMember: { id: string; code: string } | null;
  createdAt: ISODate;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string | null; // housekeeping staff may have none
  phone: string | null;
  role: Role;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  salary: number | null;
  specialty: string | null;
  isActive: boolean;
  lastLoginAt: ISODate | null;
  createdAt: ISODate;
};

export type Settings = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  crNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  openingHours: string | null;
  logo: string | null;
  brandColor: string | null;
  currency: string;
  timezone: string;
  invoicePrefix: string;
  invoiceFooter: string | null;
  expiryWarnDays: number;
  plan: SubscriptionPlan;
  status: GymStatus;
  trialEndsAt: ISODate | null;
};

// ── Multi-gym ───────────────────────────────────────────────────────────────
export type SubscriptionPlan = "ESSENTIAL" | "PROFESSIONAL" | "ELITE";
export type GymStatus = "TRIAL" | "ACTIVE" | "SUSPENDED";

export type AdminGym = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  brandColor: string | null;
  phone: string | null;
  email: string | null;
  plan: SubscriptionPlan;
  status: GymStatus;
  trialEndsAt: ISODate | null;
  billingMonths: number;
  extraBranches: number;
  paidUntil: ISODate | null;
  planRequest: { months: number; extraBranches: number; total: number; requestedAt: ISODate; requestedBy: string } | null;
  platformNotes: string | null;
  createdAt: ISODate;
  owner: { name: string; email: string; lastLoginAt: ISODate | null } | null;
  members: number;
  staffCount: number;
  branches: number;
  activeMemberships: number;
  revenue30d: number;
  lastActiveAt: ISODate | null;
};
export type AdminGymsResponse = {
  gyms: AdminGym[];
  stats: { total: number; active: number; trial: number; suspended: number; members: number; mrr: number; requests: number };
};

// ── Engagement (dashboard) ──────────────────────────────────────────────────
export type ReminderItem = {
  memberId: string;
  code: string;
  name: string;
  phone: string;
  photoUrl: string | null;
  plan: string;
  endDate: ISODate;
  daysLeft: number;
  lastRemindedAt: ISODate | null;
};
export type RemindersResponse = {
  warnDays: number;
  expiredLookbackDays: number;
  expiring: ReminderItem[];
  expired: ReminderItem[];
  summary: { expiring: number; expired: number; remindedThisWeek: number; notReminded: number };
};
export type CelebrationsResponse = {
  birthdays: { memberId: string; code: string; name: string; phone: string; photoUrl: string | null; daysAway: number; turning: number; greetedAt: ISODate | null }[];
  milestones: { memberId: string; code: string; name: string; phone: string; photoUrl: string | null; milestone: number; visits: number; greetedAt: ISODate | null }[];
};

// ── WhatsApp ────────────────────────────────────────────────────────────────
export type MessageType = "RENEWAL_REMINDER" | "EXPIRED" | "WELCOME" | "PAYMENT_RECEIPT" | "BIRTHDAY" | "MILESTONE" | "CARD" | "CUSTOM";
export type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED" | "OPENED";
export type SendResult = { mode: "api" | "link"; status: "SENT" | "OPENED" | "FAILED"; url: string | null; messageId: string; error: string | null; to: string };
export type TemplateConfig = { text: string; templateName?: string | null; language?: string | null; params?: string | null };
export type WhatsAppConfig = {
  enabled: boolean;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  hasToken: boolean;
  hasAppSecret: boolean;
  verifyToken: string;
  webhookPath: string;
  templates: Record<MessageType, TemplateConfig>;
  mode: "api" | "link";
};
export type WhatsAppMessage = {
  id: string;
  type: MessageType;
  channel: "API" | "LINK";
  status: MessageStatus;
  body: string;
  error: string | null;
  toPhone: string;
  createdAt: ISODate;
  member: { id: string; code: string; name: string } | null;
  sentBy: string | null;
};
export type MessagesResponse = { messages: WhatsAppMessage[]; last30Days: Partial<Record<MessageStatus, number>> };

// ── Activity log ────────────────────────────────────────────────────────────
export type ActivityEntry = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  summary: string;
  createdAt: ISODate;
  staff: { id: string; name: string; role: Role } | null;
};

// ── Digital member card (public) ────────────────────────────────────────────
export type MemberCard = {
  name: string;
  firstName: string;
  code: string;
  token: string;
  photoUrl: string | null;
  gym: { name: string; logo: string | null; brandColor: string | null; phone: string | null };
  membership: { plan: string; color: string; endDate: ISODate; status: MemberStatus } | null;
};
