"use client";
/**
 * Send a WhatsApp message to a member from anywhere in the app:
 *   const send = useWhatsApp();
 *   await send(memberId, "RENEWAL_REMINDER");
 * - Business API connected → sent from the server, toast confirms.
 * - Otherwise → WhatsApp opens (web / app) with the message ready to send.
 */
import { useCallback } from "react";
import { useUser } from "@/components/layout/session-context";
import { useToast } from "@/components/ui";
import { invalidate } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { MessageType, SendResult } from "@/types/api";

export function useWhatsApp() {
  const user = useUser();
  const toast = useToast();
  const apiMode = !!user.gym?.whatsappEnabled;

  return useCallback(
    async (memberId: string, type: MessageType, opts: { text?: string; extra?: Record<string, string>; quiet?: boolean } = {}) => {
      // Browsers only allow opening a tab straight after a click, so open it now and fill it in later.
      const tab = apiMode ? null : window.open("about:blank", "_blank");
      try {
        const r = await api.post<SendResult>("/api/whatsapp/send", { memberId, type, text: opts.text, extra: opts.extra });
        invalidate("/api/reminders");
        invalidate("/api/celebrations");
        invalidate("/api/whatsapp/messages");
        invalidate(`/api/members/${memberId}`);
        if (r.mode === "link" && r.url) {
          if (tab) tab.location.href = r.url;
          else window.open(r.url, "_blank");
        } else {
          tab?.close();
          if (r.status === "SENT") {
            if (!opts.quiet) toast("success", "WhatsApp message sent");
          } else {
            toast("error", `WhatsApp: ${r.error ?? "sending failed"}`);
            if (r.url) window.open(r.url, "_blank");
          }
        }
        return r;
      } catch (e) {
        tab?.close();
        toast("error", e instanceof Error ? e.message : "Couldn't send the message");
        return null;
      }
    },
    [apiMode, toast],
  );
}
