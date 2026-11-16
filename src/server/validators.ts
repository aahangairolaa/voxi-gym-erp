/**
 * Input validation for every API route (using zod).
 * If a request doesn't match, the API answers 400 with a readable message.
 */
import { z } from "zod";
import { fromDateInput } from "@/lib/dates";

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

/** Qatar numbers: 8 digits, optional +974 */
const phone = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20)
  .regex(/^[+\d\s-]+$/, "Phone can only contain digits, spaces, + and -");

export const paymentMethod = z.enum(["CASH", "CARD", "BANK_TRANSFER", "FAWRAN", "ONLINE"]);
export const role = z.enum(["OWNER", "MANAGER", "RECEPTION", "TRAINER"]);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

// ── Members ──────────────────────────────────────────────────────────────────
export const memberSchema = z.object({
  firstName: str(60).min(1, "First name is required"),
  lastName: str(60).min(1, "Last name is required"),
  phone,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  dateOfBirth: optDate,
  qid: optStr(20),
  nationality: optStr(60),
  emergencyName: optStr(80),
  emergencyPhone: optStr(20),
  notes: optStr(1000),
  branchId: optId,
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
  code: optStr(30), // member code like M-1001, or a phone number
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
  name: str(100).min(1),
  phone,
  email: z.string().trim().email().optional().nullable().or(z.literal("").transform(() => null)),
  source: z.enum(["WALK_IN", "INSTAGRAM", "WHATSAPP", "WEBSITE", "REFERRAL", "OTHER"]).default("WALK_IN"),
  status: z.enum(["NEW", "CONTACTED", "TRIAL", "CONVERTED", "LOST"]).default("NEW"),
  interest: optStr(120),
  notes: optStr(1000),
  followUpAt: optDate,
  assignedToId: optId,
});

// ── Staff ────────────────────────────────────────────────────────────────────
export const staffSchema = z.object({
  name: str(100).min(1),
  email: z.string().trim().toLowerCase().email(),
  phone: optStr(20),
  role,
  branchId: optId,
  salary: money.optional().nullable(),
  specialty: optStr(80),
  isActive: z.boolean().default(true),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ── Settings ─────────────────────────────────────────────────────────────────
export const settingsSchema = z.object({
  gymName: str(100).min(1),
  legalName: optStr(150),
  crNumber: optStr(40),
  phone: optStr(30),
  email: optStr(120),
  address: optStr(300),
  website: optStr(120),
  invoicePrefix: str(10).min(1).default("INV"),
  invoiceFooter: optStr(500),
  expiryWarnDays: z.coerce.number().int().min(1).max(60).default(7),
});

export const branchSchema = z.object({
  name: str(80).min(1),
  address: optStr(200),
  phone: optStr(30),
  isActive: z.boolean().default(true),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});
