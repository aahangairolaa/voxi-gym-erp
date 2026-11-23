/**
 * Input validation for every API route (using zod).
 * If a request doesn't match, the API answers 400 with a readable message.
 */
import { z } from "zod";
import { MAX_EXTRA_BRANCHES } from "@/lib/pricing";
import { fromDateInput } from "@/lib/dates";
import { SOURCES } from "@/lib/sources";
import { dobError, emailError, nameError, normalizePhone, passwordError, phoneError, qidError, websiteError } from "@/lib/validate";

// ── Reusable pieces ──────────────────────────────────────────────────────────
const str = (max = 200) => z.string().trim().max(max);
const optStr = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));
const money = z.coerce.number().int("Use whole riyals").min(0, "Can't be negative").max(10_000_000);
const id = z.string().min(1);
const optId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

/** Accepts "2026-11-12" (from a date input) or a full ISO string. */
const date = z
  .string()
  .min(1)
  .transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? fromDateInput(v) : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), "Invalid date");
const optDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? fromDateInput(v) : new Date(v)) : null));

/** Turns one of the shared rules (lib/validate) into a zod check. */
const rule = (check: (v: string) => string | null) => (v: string, ctx: z.RefinementCtx) => {
  const msg = check(v);
  if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
};

/** Mobile number with country code, e.g. "+974 5512 3456"; the digit count is checked per country. */
const phone = z.string().trim().max(30).superRefine(rule((v) => phoneError(v, true))).transform(normalizePhone);
/** Same, but may be left empty (a bare country code counts as empty). */
const optPhone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .nullable()
  .transform((v) => v ?? "")
  .superRefine(rule((v) => phoneError(v, false)))
  .transform((v) => (phoneError(v, true) ? null : normalizePhone(v)));

const reqEmail = z.string().trim().toLowerCase().superRefine(rule((v) => emailError(v, true)));
const optEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .nullable()
  .transform((v) => v ?? "")
  .superRefine(rule((v) => emailError(v, false)))
  .transform((v) => (v ? v : null));

const personName = (what: string) => z.string().trim().max(60).superRefine(rule((v) => nameError(v, what, true)));
/** Full name of a person, e.g. staff: letters only, at least 2 characters. */
const fullName = z.string().trim().max(100).superRefine(rule((v) => nameError(v.slice(0, 60), "Name", true)));

export const paymentMethod = z.enum(["CASH", "CARD", "BANK_TRANSFER", "FAWRAN", "ONLINE"]);
/** Roles a gym can give its staff (SUPER_ADMIN is created only by the VOXI team). */
export const role = z.enum(["OWNER", "MANAGER", "RECEPTION", "TRAINER", "HOUSEKEEPING"]);

/** A small image sent from the browser as a data: URL (photos are resized before upload). */
const imageDataUrl = (maxKb: number) =>
  z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Upload a JPG, PNG or WebP image")
    .max(maxKb * 1370, `Image is too large (max ${maxKb} KB)`);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: reqEmail,
  password: z.string().min(1, "Enter your password"),
  /** 6-digit code from the email, the first time this account signs in with a password */
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code").optional(),
});

// ── Members ──────────────────────────────────────────────────────────────────
export const MIN_MEMBER_AGE = 10;
export const memberSchema = z.object({
  firstName: personName("First name"),
  lastName: personName("Last name"),
  phone,
  email: optEmail,
  gender: z.enum(["MALE", "FEMALE"], { errorMap: () => ({ message: "Choose male or female" }) }),
  dateOfBirth: z
    .string({ required_error: "Date of birth is required", invalid_type_error: "Date of birth is required" })
    .trim()
    .superRefine(rule((v) => dobError(v, true)))
    .transform((v) => fromDateInput(v.slice(0, 10))),
  qid: optStr(20).superRefine((v, ctx) => {
    const msg = qidError(v, true);
    if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
  }),
  nationality: optStr(60),
  emergencyName: optStr(80).superRefine((v, ctx) => {
    const msg = v ? nameError(v, "Emergency contact name", false) : null;
    if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
  }),
  emergencyPhone: optPhone,
  /** How they found the gym; empty = not recorded */
  source: z.enum(SOURCES).optional().nullable(),
  /** Staff member who sold the membership / signed them up; empty = none */
  soldById: z.string().optional().nullable().transform((v) => v || null),
  /** Personal training only, no gym membership */
  ptOnly: z.boolean().optional().default(false),
  notes: optStr(1000),
  branchId: optId,
  /** undefined = keep the current photo, null = remove it */
  photo: imageDataUrl(400).nullable().optional(),
});

/** Creating a member can optionally sell a plan at the same time. */
export const createMemberSchema = memberSchema.extend({
  planId: optId,
  startDate: optDate,
  discount: money.optional().default(0),
  amountPaid: money.optional().default(0),
  paymentMethod: paymentMethod.optional().default("CASH"),
});

// ── Plans ────────────────────────────────────────────────────────────────────
export const planSchema = z.object({
  name: str(80).min(1, "Plan name is required"),
  description: optStr(500),
  durationDays: z.coerce.number().int().min(1).max(3650),
  price: money,
  sessions: z.coerce.number().int().min(1).optional().nullable(),
  freezeDays: z.coerce.number().int().min(0).max(365).default(0),
  features: z.array(str(120)).default([]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#7C5CFF"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

// ── Memberships ──────────────────────────────────────────────────────────────
export const sellMembershipSchema = z.object({
  memberId: id,
  soldById: optId,
  planId: id,
  startDate: optDate,
  discount: money.default(0),
  amountPaid: money.default(0),
  paymentMethod: paymentMethod.default("CASH"),
  reference: optStr(100),
  notes: optStr(500),
});

export const membershipActionSchema = z.object({
  action: z.enum(["freeze", "unfreeze", "cancel"]),
});

// ── Payments ─────────────────────────────────────────────────────────────────
export const paymentSchema = z.object({
  memberId: optId,
  soldById: optId,
  membershipId: optId,
  amount: money.refine((v) => v > 0, "Amount must be more than 0"),
  method: paymentMethod,
  description: optStr(300),
  reference: optStr(100),
  paidAt: optDate,
});

// ── Cash sessions ────────────────────────────────────────────────────────────
export const openCashSchema = z.object({
  branchId: id,
  openingFloat: money,
  notes: optStr(500),
});
export const closeCashSchema = z.object({
  countedCash: money,
  notes: optStr(500),
});

// ── Expenses ─────────────────────────────────────────────────────────────────
export const expenseSchema = z.object({
  category: str(60).min(1),
  description: optStr(300),
  amount: money.refine((v) => v > 0, "Amount must be more than 0"),
  method: paymentMethod.default("BANK_TRANSFER"),
  spentAt: optDate,
  branchId: optId,
});

// ── Attendance ───────────────────────────────────────────────────────────────
export const checkInSchema = z.object({
  memberId: optId,
  code: optStr(300), // member code (M-1001), phone number, or a scanned QR card link
  branchId: optId,
  override: z.boolean().default(false), // let staff admit someone without an active plan
});

// ── Biometric ────────────────────────────────────────────────────────────────
export const deviceSchema = z.object({
  name: str(80).min(1),
  type: z.enum(["FINGERPRINT", "FACE", "CARD", "PALM"]).default("FINGERPRINT"),
  vendor: optStr(60),
  serialNumber: str(80).min(1, "Serial number is required"),
  branchId: optId,
  isActive: z.boolean().default(true),
});

export const enrollSchema = z.object({
  memberId: id,
  biometricId: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

/** What a device (or the local bridge app) sends us for every scan. */
export const deviceScanSchema = z.object({
  biometricUserId: z.coerce.string().trim().min(1),
  scannedAt: z.string().datetime({ offset: true }).optional(),
  direction: z.enum(["in", "out", "auto"]).default("auto"),
});

// ── Workouts ─────────────────────────────────────────────────────────────────
export const exerciseSchema = z.object({
  name: str(80).min(1),
  muscleGroup: str(40).min(1),
  equipment: optStr(40),
});

export const workoutPlanSchema = z.object({
  name: str(80).min(1, "Give the programme a name"),
  goal: optStr(60),
  level: optStr(30),
  description: optStr(1000),
  daysPerWeek: z.coerce.number().int().min(1).max(7).default(3),
  trainerId: optId,
  memberId: optId,
  items: z
    .array(
      z.object({
        exerciseId: id,
        day: z.coerce.number().int().min(1).max(7).default(1),
        sets: z.coerce.number().int().min(1).max(20).default(3),
        reps: str(20).default("10"),
        restSeconds: z.coerce.number().int().min(0).max(600).default(60),
      }),
    )
    .default([]),
});

export const assignWorkoutSchema = z.object({ memberId: id });

export const workoutLogSchema = z.object({
  memberId: id,
  workoutPlanId: optId,
  durationMin: z.coerce.number().int().min(1).max(600),
  calories: z.coerce.number().int().min(0).max(5000).optional().nullable(),
  notes: optStr(500),
});

// ── Classes ──────────────────────────────────────────────────────────────────
export const classSchema = z.object({
  name: str(80).min(1),
  description: optStr(500),
  trainerId: optId,
  branchId: optId,
  room: optStr(40),
  startsAt: date,
  durationMin: z.coerce.number().int().min(10).max(300).default(60),
  capacity: z.coerce.number().int().min(1).max(500).default(15),
});

export const bookingSchema = z.object({ memberId: id });
export const bookingUpdateSchema = z.object({
  bookingId: id,
  status: z.enum(["BOOKED", "ATTENDED", "CANCELLED", "NO_SHOW"]),
});

// ── Leads ────────────────────────────────────────────────────────────────────
export const leadSchema = z.object({
  name: fullName,
  phone,
  email: optEmail,
  source: z.enum(SOURCES).default("WALK_IN"),
  status: z.enum(["NEW", "CONTACTED", "TRIAL", "CONVERTED", "LOST"]).default("NEW"),
  interest: optStr(120),
  notes: optStr(1000),
  followUpAt: optDate,
  assignedToId: optId,
});

// ── Staff ────────────────────────────────────────────────────────────────────
export const staffSchema = z.object({
  name: fullName,
  /** Required for everyone who signs in; housekeeping staff don't sign in, so it's optional for them. */
  email: optEmail,
  phone,
  role,
  branchId: optId,
  salary: money.optional().nullable(),
  specialty: optStr(80),
  isActive: z.boolean().default(true),
  /** undefined = keep the current photo, null = remove it */
  photo: imageDataUrl(400).nullable().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ── Settings ─────────────────────────────────────────────────────────────────
export const settingsSchema = z.object({
  name: str(100).min(1, "Gym name is required"),
  legalName: optStr(150),
  crNumber: optStr(40),
  phone: optPhone,
  email: optEmail,
  address: optStr(300),
  website: optStr(120).superRefine((v, ctx) => {
    const msg = websiteError(v);
    if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
  }),
  instagram: optStr(80),
  openingHours: optStr(200),
  /** undefined = keep, null = remove */
  logo: imageDataUrl(300).nullable().optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour").default("#7C5CFF"),
  invoicePrefix: str(10).min(1).default("INV"),
  invoiceFooter: optStr(500),
  expiryWarnDays: z.coerce.number().int().min(1).max(60).default(7),
});

export const branchSchema = z.object({
  name: str(80).min(1, "Branch name is required"),
  address: optStr(200),
  phone: optPhone,
  isActive: z.boolean().default(true),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().default(""), // empty for Google accounts setting their first password
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const email = reqEmail;
export const registerSchema = z.object({
  gymName: z.string().trim().min(2, "Enter your gym's name").max(100),
  firstName: personName("First name"),
  lastName: personName("Last name"),
  email,
  phone,
  password: z
    .string()
    .max(200)
    .superRefine(rule(passwordError))
    .optional()
    .nullable(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms and privacy policy" }) }),
  /** "Send me offers and product news from VOXI" (optional) */
  marketingOptIn: z.boolean().optional().default(false),
  website: z.string().max(0).optional(), // honeypot: real people leave this empty
  /** 6-digit code from the email (second step of email sign-up) */
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code").optional(),
});
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().max(200).superRefine(rule(passwordError)),
});

// ── WhatsApp ─────────────────────────────────────────────────────────────────
const messageType = z.enum(["RENEWAL_REMINDER", "EXPIRED", "WELCOME", "PAYMENT_RECEIPT", "BIRTHDAY", "MILESTONE", "CARD", "CUSTOM"]);

export const whatsappSendSchema = z.object({
  memberId: id,
  type: messageType,
  text: optStr(2000),
  extra: z.record(z.string().max(300)).optional(),
});

/** Files sent to a member (invoice / card PDFs made in the browser, photos, documents). Base64, 3 MB in all (requests to the server are capped at 4.5 MB). */
export const MEMBER_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const memberSendSchema = z
  .object({
    channel: z.enum(["EMAIL", "WHATSAPP"]),
    subject: optStr(150),
    text: str(4000),
    attachments: z
      .array(
        z.object({
          name: str(120).min(1),
          type: z.enum(MEMBER_FILE_TYPES, { errorMap: () => ({ message: "Only PDF and image files (JPG, PNG, WebP) can be attached." }) }),
          data: z.string().max(5_000_000).regex(/^[A-Za-z0-9+/=]*$/, "The file couldn't be read."),
        }),
      )
      .max(6, "Attach up to 6 files.")
      .default([]),
  })
  .superRefine((v, ctx) => {
    const bytes = v.attachments.reduce((a, f) => a + Math.floor((f.data.length * 3) / 4), 0);
    if (bytes > 3_000_000) ctx.addIssue({ code: "custom", path: ["attachments"], message: "Attachments are too big together (3 MB at most)." });
    if (!v.text.trim() && !v.attachments.length) ctx.addIssue({ code: "custom", path: ["text"], message: "Write a message or attach a file." });
  });

export const whatsappBulkSchema = z.object({
  memberIds: z.array(id).min(1).max(200),
  type: messageType,
});

export const whatsappTestSchema = z.object({ phone });

const templateConfig = z.object({
  text: str(1000).min(1),
  templateName: optStr(120),
  language: optStr(10),
  params: optStr(300),
});

export const whatsappConfigSchema = z.object({
  enabled: z.boolean().default(false),
  phoneNumberId: optStr(40),
  businessAccountId: optStr(40),
  /** "" or omitted = keep the saved token, null = remove it */
  accessToken: z.string().trim().max(1000).nullable().optional(),
  appSecret: z.string().trim().max(200).nullable().optional(),
  templates: z.record(messageType, templateConfig).optional(),
});

// ── VOXI admin (gyms) ────────────────────────────────────────────────────────
const subscription = z.enum(["ESSENTIAL", "PROFESSIONAL", "ELITE"]);
const gymStatus = z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]);

export const createGymSchema = z.object({
  name: str(100).min(2, "Gym name is required"),
  slug: optStr(40),
  phone: optPhone,
  email: optEmail,
  address: optStr(200),
  branchName: optStr(80),
  plan: subscription.default("PROFESSIONAL"),
  status: gymStatus.default("TRIAL"),
  trialDays: z.coerce.number().int().min(1).max(90).default(7),
  billingMonths: z.coerce.number().int().refine((n) => [3, 6, 12].includes(n), "Choose 3, 6 or 12 months").default(12),
  extraBranches: z.coerce.number().int().min(0).max(MAX_EXTRA_BRANCHES).default(0),
  ownerName: fullName,
  ownerEmail: reqEmail,
  ownerPassword: z.string().min(8, "Password must be at least 8 characters"),
});

/** Only the fields that are sent are changed (no defaults here on purpose). */
export const updateGymSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  plan: subscription.optional(),
  status: gymStatus.optional(),
  trialEndsAt: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? fromDateInput(v) : new Date(v)) : null)),
  platformNotes: z.string().trim().max(1000).nullable().optional(),
  billingMonths: z.coerce.number().int().refine((n) => [3, 6, 12].includes(n), "Choose 3, 6 or 12 months").optional(),
  extraBranches: z.coerce.number().int().min(0).max(MAX_EXTRA_BRANCHES).optional(),
  paidUntil: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? fromDateInput(v) : new Date(v)) : null)),
  /** Activate the plan the gym requested from Billing (sets term, branches, paid-until, status ACTIVE). */
  applyRequest: z.boolean().optional(),
  /** Switch the VOXI Café add-on on or off by hand */
  cafeEnabled: z.boolean().optional(),
});

/** A gym owner/manager asks to start or change their subscription from Billing. */
export const planRequestSchema = z.object({
  months: z.coerce.number().int().refine((n) => [3, 6, 12].includes(n), "Choose 3, 6 or 12 months"),
  extraBranches: z.coerce.number().int().min(0).max(MAX_EXTRA_BRANCHES),
  /** One-time services: biometric entrances to install and data migration. */
  entrances: z.coerce.number().int().min(0).max(10).default(0),
  onboarding: z.boolean().default(false),
  promoCode: z.string().trim().max(40).optional().nullable(),
  /** VOXI Café add-on */
  cafe: z.boolean().default(false),
});

// ── VOXI Café ────────────────────────────────────────────────────────────────
export const CAFE_CATEGORIES = ["COFFEE", "SHAKE", "JUICE", "SNACK", "MEAL", "DRINK"] as const;

export const cafeItemSchema = z.object({
  name: z.string().trim().min(2, "Give the item a name").max(60),
  category: z.enum(CAFE_CATEGORIES, { errorMap: () => ({ message: "Choose a category" }) }),
  price: z.coerce.number().int("Whole riyals only").min(1, "Price must be at least QAR 1").max(1000, "Check the price"),
  calories: z.coerce.number().int().min(0).max(5000).optional().nullable(),
  protein: z.coerce.number().int().min(0).max(300).optional().nullable(),
  stock: z.coerce.number().int().min(0, "Stock can't be negative").max(100000).optional().nullable(),
  active: z.boolean().default(true),
});

export const cafeSaleSchema = z.object({
  items: z
    .array(z.object({ itemId: z.string().min(1), qty: z.coerce.number().int().min(1).max(50) }))
    .min(1, "Add at least one item")
    .max(30),
  method: z.enum(["CASH", "CARD", "TRANSFER"]),
  memberId: z.string().optional().nullable(),
});

export const cafeRoleSchema = z.object({
  cafeRole: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

/** A VOXI promo code (admin). */
export const promoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Use at least 3 characters")
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only, no spaces"),
    kind: z.enum(["PERCENT", "AMOUNT"]),
    value: z.coerce.number().int("Whole numbers only").min(1, "Must be at least 1"),
    appliesTo: z.enum(["ALL", "SUBSCRIPTION", "ONE_TIME"]).default("ALL"),
    minMonths: z.coerce.number().int().refine((n) => [3, 6, 12].includes(n)).optional().nullable(),
    expiresAt: optDate,
    maxUses: z.coerce.number().int().min(1).optional().nullable(),
    note: optStr(200),
  })
  .refine((p) => p.kind !== "PERCENT" || p.value <= 100, { message: "A percentage can't be more than 100", path: ["value"] });

// ── Personal training ────────────────────────────────────────────────────────
export const ptPackageSchema = z.object({
  memberId: id,
  trainerId: z.string().min(1, "Choose the trainer"),
  name: z.string().trim().max(60).optional().nullable(),
  sessionsTotal: z.coerce.number().int("Whole sessions only").min(1, "At least 1 session").max(500),
  price: money,
  expiresAt: optDate,
  amountPaid: money.default(0),
  paymentMethod: paymentMethod.default("CASH"),
  soldById: optId,
  notes: optStr(300),
});

export const ptSessionSchema = z.object({
  packageId: id,
  notes: optStr(500),
  doneAt: optDate,
});

// ── Extras (towel, sauna...) ─────────────────────────────────────────────────
export const extraItemSchema = z.object({
  name: z.string().trim().min(2, "Give it a name").max(60),
  price: money.refine((v) => v > 0, "Price must be more than 0"),
  active: z.boolean().default(true),
});

export const extraChargeSchema = z.object({
  extraItemId: id,
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  memberId: optId,
  method: paymentMethod,
  soldById: optId,
  reference: optStr(100),
});

// ── Lead import ──────────────────────────────────────────────────────────────
export const leadImportSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        source: z.string().optional().nullable(),
        interest: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1, "The file has no rows")
    .max(2000, "Import up to 2,000 leads at a time"),
  commit: z.boolean().default(false),
});
