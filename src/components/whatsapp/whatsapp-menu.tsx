"use client";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuMessageCircle } from "react-icons/lu";
import { Button, Field, Modal, Textarea } from "@/components/ui";
import { MESSAGE_TYPES } from "@/lib/whatsapp-templates";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/api";
import { useWhatsApp } from "./use-whatsapp";

/** "WhatsApp ▾" button with every message type (reminder, card, birthday, custom …). */
export function WhatsAppMenu({
  memberId,
  memberName,
  types = ["RENEWAL_REMINDER", "EXPIRED", "CARD", "WELCOME", "BIRTHDAY", "MILESTONE", "CUSTOM"],
  className,
}: {
  memberId: string;
  memberName: string;
  types?: MessageType[];
  className?: string;
}) {
  const send = useWhatsApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = async (type: MessageType) => {
    setOpen(false);
    if (type === "CUSTOM") return setCompose(true);
    setBusy(true);
    await send(memberId, type);
    setBusy(false);
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} loading={busy}>
        <LuMessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp <LuChevronDown className="h-3.5 w-3.5 text-muted" />
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          {MESSAGE_TYPES.filter((t) => types.includes(t.type)).map((t) => (
            <button
              key={t.type}
              onClick={() => choose(t.type)}
              className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-surface-2"
            >
              <span className="text-sm font-medium text-ink">{t.label}</span>
              <span className="text-xs text-muted">{t.description}</span>
            </button>
          ))}
        </div>
      )}
      <ComposeModal open={compose} onClose={() => setCompose(false)} memberId={memberId} memberName={memberName} />
    </div>
  );
}

export function ComposeModal({ open, onClose, memberId, memberName }: { open: boolean; onClose: () => void; memberId: string; memberName: string }) {
  const send = useWhatsApp();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setText(`Hi ${memberName.split(" ")[0]}, `);
  }, [open, memberName]);

  const submit = async () => {
    setBusy(true);
    const r = await send(memberId, "CUSTOM", { text });
    setBusy(false);
    if (r) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`WhatsApp ${memberName}`}
      description="Write a message. It's saved in the member's message history."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={text.trim().length < 2}>
            <LuMessageCircle className="h-4 w-4" /> Send
          </Button>
        </>
      }
    >
      <Field label="Message">
        <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} autoFocus maxLength={1000} />
      </Field>
    </Modal>
  );
}
