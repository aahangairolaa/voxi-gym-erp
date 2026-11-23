"use client";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuFileText, LuIdCard, LuPaperclip, LuSend } from "react-icons/lu";
import { Spinner } from "@/components/ui";
import { useWhatsApp } from "@/components/whatsapp/use-whatsapp";
import { QUICK_TYPES } from "@/lib/whatsapp-templates";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/api";
import type { SendPreset } from "./send-member-modal";

/**
 * "Send ▾" on a member profile. The button opens the Send window (message + files);
 * the arrow lists shortcuts: welcome with card, latest invoice, and one-tap WhatsApp texts.
 */
export function SendMenu({ memberId, latestInvoiceId, onOpen }: { memberId: string; latestInvoiceId: string | null; onOpen: (p: SendPreset) => void }) {
  const sendWa = useWhatsApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<MessageType | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // The menu floats above the page (the profile header clips anything that overflows it)
  const toggle = () => {
    if (open) return setOpen(false);
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const hide = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [open]);

  const pick = (p: SendPreset) => {
    setOpen(false);
    onOpen(p);
  };
  const quick = async (type: MessageType) => {
    setBusy(type);
    await sendWa(memberId, type);
    setBusy(null);
    setOpen(false);
  };

  const Item = ({ icon, title, sub, onClick, loading }: { icon?: React.ReactNode; title: string; sub: string; onClick: () => void; loading?: boolean }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-2">
      {icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
      {loading && <Spinner className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <div className="inline-flex overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <button type="button" onClick={() => pick({ kind: "custom" })} className="inline-flex h-10 items-center gap-2 px-3.5 text-sm font-semibold text-ink hover:bg-surface-2">
          <LuSend className="h-4 w-4" /> Send
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label="More ways to send"
          aria-expanded={open}
          className="inline-flex h-10 items-center border-l border-line px-2.5 text-muted hover:bg-surface-2 hover:text-ink"
        >
          <LuChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && pos && (
        <div
          style={{ top: pos.top, right: pos.right, maxHeight: `calc(100vh - ${pos.top + 16}px)` }}
          className="fixed z-50 w-72 max-w-[calc(100vw-16px)] animate-scale-in overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-xl"
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.15em] text-muted uppercase">With files</p>
          <Item icon={<LuIdCard className="h-4 w-4" />} title="Welcome + membership card" sub="Card PDF with the check-in QR" onClick={() => pick({ kind: "welcome" })} />
          {latestInvoiceId && <Item icon={<LuFileText className="h-4 w-4" />} title="Latest invoice" sub="Invoice PDF and link" onClick={() => pick({ kind: "invoice", paymentId: latestInvoiceId })} />}
          <Item icon={<LuPaperclip className="h-4 w-4" />} title="Message with files" sub="WhatsApp or email, add photos or PDFs" onClick={() => pick({ kind: "custom" })} />
          <div className="my-1.5 border-t border-line" />
          <p className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-[0.15em] text-muted uppercase">Quick WhatsApp texts</p>
          {QUICK_TYPES.map((t) => (
            <Item key={t.type} title={t.label} sub={t.description} onClick={() => quick(t.type)} loading={busy === t.type} />
          ))}
        </div>
      )}
    </div>
  );
}
