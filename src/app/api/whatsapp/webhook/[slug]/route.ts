/**
 * Meta (WhatsApp Business) webhook for one gym — delivery & read receipts.
 * In the Meta developer dashboard set:
 *   Callback URL:  https://<your-domain>/api/whatsapp/webhook/<gym-slug>
 *   Verify token:  the token shown in VOXI → Settings → WhatsApp
 * and subscribe to the "messages" field.
 */
import type { NextRequest } from "next/server";
import { ApiError } from "@/server/http";
import { handleWebhook, verifyWebhook } from "@/server/services/whatsapp.service";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const q = req.nextUrl.searchParams;
  try {
    const challenge = await verifyWebhook(slug, q.get("hub.mode"), q.get("hub.verify_token"), q.get("hub.challenge"));
    return new Response(challenge, { headers: { "Content-Type": "text/plain" } });
  } catch (e) {
    return new Response("Forbidden", { status: e instanceof ApiError ? e.status : 403 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  try {
    const r = await handleWebhook(slug, await req.text(), req.headers.get("x-hub-signature-256"));
    return Response.json(r);
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    if (status === 500) console.error("[whatsapp webhook]", e);
    return new Response("Error", { status });
  }
}
