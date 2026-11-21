"use client";
import { useState } from "react";
import { LuCopy, LuExternalLink, LuMessageCircle, LuRefreshCw } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { Button, Modal, useConfirm, useToast } from "@/components/ui";
import { useWhatsApp } from "@/components/whatsapp/use-whatsapp";
import { api } from "@/lib/api-client";
import type { MemberDetail } from "@/types/api";
import { MemberCardVisual } from "./member-card-visual";

/** Show a member's digital card, copy/share its link, send it on WhatsApp, or issue a new one. */
export function MemberCardModal({ open, onClose, member, onChanged }: { open: boolean; onClose: () => void; member: MemberDetail; onChanged: () => void }) {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const send = useWhatsApp();
  const [busy, setBusy] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/c/${member.qrToken}`;
  const cur = member.currentMembership;

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    toast("success", "Card link copied");
  };

  const regenerate = async () => {
    const ok = await confirm({
      title: "Issue a new card?",
      message: "The old QR code and link stop working straight away (use this if a card was shared by mistake).",
      confirmLabel: "Issue new card",
    });
    if (!ok) return;
    setBusy("new");
    try {
      await api.post(`/api/members/${member.id}/card`);
      toast("success", "New card issued");
      onChanged();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Digital member card"
      description="Members save this link on their phone and show the QR code at reception."
      footer={
        <div className="flex w-full flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={regenerate} loading={busy === "new"}>
            <LuRefreshCw className="h-4 w-4" /> New card
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copy}>
              <LuCopy className="h-4 w-4" /> Copy link
            </Button>
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="secondary">
                <LuExternalLink className="h-4 w-4" /> Open
              </Button>
            </a>
            <Button
              loading={busy === "wa"}
              onClick={async () => {
                setBusy("wa");
                await send(member.id, "CARD");
                setBusy(null);
              }}
            >
              <LuMessageCircle className="h-4 w-4" /> Send on WhatsApp
            </Button>
          </div>
        </div>
      }
    >
      <MemberCardVisual
        gym={{ name: user.gym?.name ?? "VOXI", logo: user.gym?.logo ?? null, brandColor: user.gym?.brandColor ?? null }}
        name={member.name}
        code={member.code}
        photoUrl={member.photoUrl}
        qrValue={url}
        membership={cur ? { plan: cur.plan.name, endDate: cur.endDate, status: cur.effectiveStatus } : null}
      />
    </Modal>
  );
}
