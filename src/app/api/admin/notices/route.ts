import { z } from "zod";
import { route, readBody } from "@/server/http";
import { requireRole } from "@/server/auth";
import { fromDateInput, endOfDay } from "@/lib/dates";
import { createNotice, listNotices } from "@/server/services/platform.service";
import { logAdmin } from "@/server/services/admin-log.service";

const schema = z.object({
  message: z.string().trim().min(3, "Write a message").max(280, "Keep it under 280 characters"),
  tone: z.enum(["INFO", "WARNING", "SUCCESS"]).default("INFO"),
  audience: z.enum(["ALL", "TRIAL", "ACTIVE"]).default("ALL"),
  link: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => v || null)
    .refine((v) => !v || /^(https?:\/\/|\/)/.test(v), "Links start with https:// or /"),
  endsAt: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? endOfDay(fromDateInput(v)) : null)),
});

/** GET /api/admin/notices → recent announcements */
export const GET = route(async () => {
  await requireRole("SUPER_ADMIN");
  return { notices: await listNotices() };
});

/** POST /api/admin/notices { message, tone, audience, link?, endsAt? } → shows it to gyms (replaces the current one) */
export const POST = route(async (req) => {
  const s = await requireRole("SUPER_ADMIN");
  const input = await readBody(req, schema);
  const n = await createNotice(input);
  await logAdmin(s.name, "notice.create", `Posted an announcement: "${input.message.slice(0, 80)}${input.message.length > 80 ? "…" : ""}"`);
  return n;
});
