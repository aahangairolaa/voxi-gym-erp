/**
 * WhatsApp messaging
 * ──────────────────
 * Two ways to send, chosen automatically per gym:
 *
 *  1. WhatsApp Business API (Meta Cloud API) — when the gym has entered its
 *     Phone number ID + access token in Settings → WhatsApp and switched it on.
 *     Messages are sent from the server; delivery & read receipts arrive at
 *     /api/whatsapp/webhook/<gym-slug> and update the message log.
 *
 *  2. WhatsApp link — otherwise. VOXI returns a wa.me link with the text ready;
 *     the browser opens WhatsApp on the staff member's phone/computer.
 *
 * Every message (either way) is saved in WhatsAppMessage for the log & reminders.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MessageType as DbMessageType, Prisma } from "@prisma/client";
import type { z } from "zod";
import { formatDate } from "@/lib/format";
import {
  DEFAULT_TEMPLATES,
  fillTemplate,
  toWhatsAppNumber,
  whatsappLink,
  type MessageType,
  type TemplateConfig,
} from "@/lib/whatsapp-templates";
import { db } from "../db";
import { ApiError } from "../http";
import type { GymSession } from "../auth";
import { decryptSecret, encryptSecret, randomToken } from "../crypto";
import type { whatsappConfigSchema } from "../validators";
import { daysLeft, fullName, ownedOr404 } from "./_shared";

const GRAPH_URL = "https://graph.facebook.com/v21.0";

// ── Templates & config ──────────────────────────────────────────────────────

export function templatesFor(stored: Prisma.JsonValue | null | undefined): Record<MessageType, TemplateConfig> {
  const custom = (stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}) as Record<string, TemplateConfig>;
  const out = { ...DEFAULT_TEMPLATES };
  for (const key of Object.keys(out) as MessageType[]) {
    const c = custom[key];
    if (c && typeof c.text === "string" && c.text.trim()) out[key] = { ...out[key], ...c };
  }
  return out;
}

export async function getConfig(gymId: string) {
  const g = ownedOr404(
    await db.gym.findUnique({
      where: { id: gymId },
      select: {
        slug: true,
        whatsappEnabled: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
        whatsappTokenEnc: true,
        whatsappAppSecretEnc: true,
        whatsappVerifyToken: true,
        whatsappTemplates: true,
      },
    }),
    "Gym",
  );
  // Every gym gets a webhook verify token the first time it opens the settings
  let verifyToken = g.whatsappVerifyToken;
  if (!verifyToken) {
    verifyToken = randomToken(12);
    await db.gym.update({ where: { id: gymId }, data: { whatsappVerifyToken: verifyToken } });
  }
  return {
    enabled: g.whatsappEnabled,
    phoneNumberId: g.whatsappPhoneNumberId,
    businessAccountId: g.whatsappBusinessAccountId,
    hasToken: !!g.whatsappTokenEnc,
    hasAppSecret: !!g.whatsappAppSecretEnc,
    verifyToken,
    webhookPath: `/api/whatsapp/webhook/${g.slug}`,
    templates: templatesFor(g.whatsappTemplates),
    mode: g.whatsappEnabled && g.whatsappPhoneNumberId && g.whatsappTokenEnc ? ("api" as const) : ("link" as const),
  };
}

export async function updateConfig(gymId: string, input: z.infer<typeof whatsappConfigSchema>) {
  const data: Prisma.GymUpdateInput = {
    whatsappEnabled: input.enabled,
    whatsappPhoneNumberId: input.phoneNumberId,
    whatsappBusinessAccountId: input.businessAccountId,
  };
  // Secrets: undefined/"" = keep, null = remove, text = replace
  if (input.accessToken === null) data.whatsappTokenEnc = null;
  else if (input.accessToken) data.whatsappTokenEnc = encryptSecret(input.accessToken);
  if (input.appSecret === null) data.whatsappAppSecretEnc = null;
  else if (input.appSecret) data.whatsappAppSecretEnc = encryptSecret(input.appSecret);
  if (input.templates) data.whatsappTemplates = input.templates as Prisma.InputJsonValue;
  if (input.enabled && !input.phoneNumberId) throw new ApiError(400, "Enter the Phone number ID before switching the API on.");
  await db.gym.update({ where: { id: gymId }, data });
  const cfg = await getConfig(gymId);
  if (input.enabled && !cfg.hasToken) throw new ApiError(400, "Enter the access token before switching the API on.");
  return cfg;
}

// ── Sending ─────────────────────────────────────────────────────────────────

type ApiCreds = { phoneNumberId: string; token: string };

async function apiCreds(gymId: string): Promise<ApiCreds | null> {
  const g = await db.gym.findUnique({
    where: { id: gymId },
    select: { whatsappEnabled: true, whatsappPhoneNumberId: true, whatsappTokenEnc: true },
  });
  if (!g?.whatsappEnabled || !g.whatsappPhoneNumberId) return null;
  const token = decryptSecret(g.whatsappTokenEnc);
  return token ? { phoneNumberId: g.whatsappPhoneNumberId, token } : null;
}

/** Call the Meta Cloud API. Returns the message id, or throws with Meta's error text. */
async function sendViaApi(creds: ApiCreds, to: string, body: string, tpl: TemplateConfig, vars: Record<string, string>) {
  const payload = tpl.templateName
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: tpl.templateName,
          language: { code: tpl.language || "en" },
          components: [
            {
              type: "body",
              parameters: (tpl.params ?? "")
                .split(",")
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p) => ({ type: "text", text: vars[p] ?? "" })),
            },
          ],
        },
      }
    : { messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: true } };

  const res = await fetch(`${GRAPH_URL}/${creds.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
  if (!res.ok || !json.messages?.[0]?.id) throw new Error(json.error?.message ?? `WhatsApp API error (${res.status})`);
  return json.messages[0].id;
}

export type SendResult = {
  mode: "api" | "link";
  status: "SENT" | "OPENED" | "FAILED";
  url: string | null; // wa.me link to open (link mode)
  messageId: string;
  error: string | null;
  to: string;
};

/** Variables for a member's message. */
async function memberVars(gymId: string, memberId: string, origin: string) {
  const m = ownedOr404(
    await db.member.findFirst({
      where: { id: memberId, gymId },
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        phone: true,
        qrToken: true,
        gym: { select: { name: true } },
        memberships: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { endDate: "desc" },
          take: 1,
          select: { endDate: true, plan: { select: { name: true } } },
        },
      },
    }),
    "Member",
  );
  const ms = m.memberships[0];
  const visits = await db.attendance.count({ where: { gymId, memberId } });
  return {
    member: m,
    vars: {
      firstName: m.firstName,
      name: fullName(m),
      gym: m.gym.name,
      code: m.code,
      plan: ms?.plan.name ?? "",
      endDate: ms ? formatDate(ms.endDate) : "",
      daysLeft: ms ? String(Math.max(0, daysLeft(ms.endDate))) : "",
      cardUrl: `${origin}/c/${m.qrToken}`,
      visits: String(visits),
    } as Record<string, string>,
  };
}

/**
 * Send (or prepare) a WhatsApp message to a member and log it.
 * `extra` adds/overrides placeholders (e.g. amount & invoiceNo for receipts, text for CUSTOM).
 */
export async function sendToMember(
  session: GymSession,
  input: { memberId: string; type: MessageType; text?: string | null; extra?: Record<string, string> },
  origin: string,
): Promise<SendResult> {
  const gymId = session.gymId;
  const gym = await db.gym.findUnique({ where: { id: gymId }, select: { whatsappTemplates: true } });
  const templates = templatesFor(gym?.whatsappTemplates);
  const { member, vars } = await memberVars(gymId, input.memberId, origin);
  Object.assign(vars, input.extra ?? {});
  if (input.text) vars.text = input.text;

  const tpl = templates[input.type];
  // A custom text typed by staff replaces the template text (for any type)
  const body = (input.text && input.type !== "CUSTOM" ? input.text : fillTemplate(tpl.text, vars)).trim();
  if (!body) throw new ApiError(400, "The message is empty.");
  const to = toWhatsAppNumber(member.phone);
  if (to.length < 8) throw new ApiError(400, `${fullName(member)}'s phone number doesn't look valid for WhatsApp.`);

  const creds = await apiCreds(gymId);
  if (!creds) {
    const msg = await db.whatsAppMessage.create({
      data: { gymId, memberId: member.id, toPhone: to, type: input.type as DbMessageType, channel: "LINK", status: "OPENED", body, sentById: session.staffId },
    });
    return { mode: "link", status: "OPENED", url: whatsappLink(to, body), messageId: msg.id, error: null, to };
  }

  try {
    // Custom text with no template: send as plain text even if the type has a template
    const providerId = await sendViaApi(creds, to, body, input.text ? { text: body } : tpl, vars);
    const msg = await db.whatsAppMessage.create({
      data: { gymId, memberId: member.id, toPhone: to, type: input.type as DbMessageType, channel: "API", status: "SENT", body, providerId, sentById: session.staffId },
    });
    return { mode: "api", status: "SENT", url: null, messageId: msg.id, error: null, to };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Sending failed";
    const msg = await db.whatsAppMessage.create({
      data: { gymId, memberId: member.id, toPhone: to, type: input.type as DbMessageType, channel: "API", status: "FAILED", body, error, sentById: session.staffId },
    });
    // Still give staff a way to send it by hand
    return { mode: "api", status: "FAILED", url: whatsappLink(to, body), messageId: msg.id, error, to };
  }
}

/** Send the same kind of message to many members (API mode only). */
export async function sendBulk(session: GymSession, memberIds: string[], type: MessageType, origin: string) {
  if (!(await apiCreds(session.gymId))) {
    throw new ApiError(400, "Bulk sending needs the WhatsApp Business API. Set it up in Settings → WhatsApp, or send one by one.");
  }
  let sent = 0;
  let failed = 0;
  for (const memberId of memberIds.slice(0, 200)) {
    try {
      const r = await sendToMember(session, { memberId, type }, origin);
      if (r.status === "SENT") sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

/** Send a plain test message to any number (Settings → WhatsApp → Test). */
export async function sendTest(gymId: string, phone: string) {
  const creds = await apiCreds(gymId);
  if (!creds) throw new ApiError(400, "Save the Phone number ID and access token and switch the API on first.");
  const id = await sendViaApi(creds, toWhatsAppNumber(phone), "VOXI test message: your WhatsApp Business API is connected.", { text: "" }, {}).catch((e: Error) => {
    throw new ApiError(400, `WhatsApp said: ${e.message}`);
  });
  return { ok: true, providerId: id };
}

// ── Log ─────────────────────────────────────────────────────────────────────

export async function listMessages(gymId: string, opts: { type?: string | null; memberId?: string | null; limit?: number }) {
  const rows = await db.whatsAppMessage.findMany({
    where: {
      gymId,
      ...(opts.type && opts.type !== "ALL" ? { type: opts.type as DbMessageType } : {}),
      ...(opts.memberId ? { memberId: opts.memberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.limit ?? 200, 500),
    include: {
      member: { select: { id: true, code: true, firstName: true, lastName: true } },
      sentBy: { select: { name: true } },
    },
  });
  const since = new Date(Date.now() - 30 * 86_400_000);
  const counts = await db.whatsAppMessage.groupBy({ by: ["status"], where: { gymId, createdAt: { gte: since } }, _count: { _all: true } });
  return {
    messages: rows.map((r) => ({
      id: r.id,
      type: r.type,
      channel: r.channel,
      status: r.status,
      body: r.body,
      error: r.error,
      toPhone: r.toPhone,
      createdAt: r.createdAt,
      member: r.member ? { id: r.member.id, code: r.member.code, name: fullName(r.member) } : null,
      sentBy: r.sentBy?.name ?? null,
    })),
    last30Days: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
  };
}

// ── Webhook (delivery / read receipts from Meta) ────────────────────────────

export async function verifyWebhook(slug: string, mode: string | null, token: string | null, challenge: string | null) {
  const g = await db.gym.findUnique({ where: { slug }, select: { whatsappVerifyToken: true } });
  if (mode === "subscribe" && g?.whatsappVerifyToken && token === g.whatsappVerifyToken) return challenge ?? "";
  throw new ApiError(403, "Verification failed.");
}

const STATUS_MAP: Record<string, "SENT" | "DELIVERED" | "READ" | "FAILED"> = {
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
};
const RANK = { SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4, OPENED: 0 } as const;

export async function handleWebhook(slug: string, rawBody: string, signature: string | null) {
  const g = await db.gym.findUnique({ where: { slug }, select: { id: true, whatsappAppSecretEnc: true } });
  if (!g) throw new ApiError(404, "Unknown gym.");
  const secret = decryptSecret(g.whatsappAppSecretEnc);
  if (secret) {
    const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
    const ok = !!signature && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!ok) throw new ApiError(401, "Bad signature.");
  }
  type Status = { id?: string; status?: string; errors?: { title?: string; message?: string }[] };
  const body = JSON.parse(rawBody || "{}") as { entry?: { changes?: { value?: { statuses?: Status[] } }[] }[] };
  let updated = 0;
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const st of change.value?.statuses ?? []) {
        const status = st.status ? STATUS_MAP[st.status] : undefined;
        if (!st.id || !status) continue;
        const msg = await db.whatsAppMessage.findFirst({ where: { gymId: g.id, providerId: st.id }, select: { id: true, status: true } });
        if (!msg || RANK[status] < RANK[msg.status]) continue; // never go backwards (read → delivered)
        await db.whatsAppMessage.update({
          where: { id: msg.id },
          data: { status, error: status === "FAILED" ? st.errors?.[0]?.message ?? st.errors?.[0]?.title ?? "Failed" : null },
        });
        updated++;
      }
    }
  }
  return { updated };
}
