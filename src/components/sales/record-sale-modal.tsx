"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuCoffee, LuDumbbell, LuIdCard, LuReceipt, LuRefreshCw, LuSparkles, LuUserPlus } from "react-icons/lu";
import { Modal } from "@/components/ui";
import { useUser } from "@/components/layout/session-context";
import { MemberFormModal } from "@/components/members/member-form-modal";
import { SellMembershipModal } from "@/components/members/sell-membership-modal";
import { RecordPaymentModal } from "@/components/members/record-payment-modal";
import { SellPtModal } from "@/components/pt/sell-pt-modal";
import { ChargeExtraModal } from "@/components/sales/charge-extra-modal";
import { invalidate } from "@/hooks/use-api";
import { can } from "@/lib/permissions";

type Kind = "new" | "renew" | "pt" | "extra" | "cafe" | "other";

/**
 * "Record a sale": one place to sell anything. Pick a box, and the usual form for
 * that sale opens (the same ones used on Members, Personal Training and so on).
 */
export function RecordSaleModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const user = useUser();
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const cafe = can(user.role, "cafe", user.gym?.rolePermissions);

  const OPTIONS: { kind: Kind; title: string; text: string; icon: typeof LuIdCard; color: string; show?: boolean }[] = [
    { kind: "new", title: "New member and membership", text: "Sign up someone new and sell their plan", icon: LuUserPlus, color: "#7c5cff" },
    { kind: "renew", title: "Membership for an existing member", text: "Renew or sell a plan to someone already in VOXI", icon: LuRefreshCw, color: "#6366f1" },
    { kind: "pt", title: "Personal training", text: "Sell a PT package, for members or PT-only clients", icon: LuDumbbell, color: "#10b981" },
    { kind: "extra", title: "Extra", text: "Towel, sauna, locker, day pass and more", icon: LuSparkles, color: "#f59e0b" },
    { kind: "cafe", title: "Café order", text: "Open the café counter", icon: LuCoffee, color: "#ec4899", show: cafe },
    { kind: "other", title: "Other payment", text: "A balance, a fee or anything else", icon: LuReceipt, color: "#64748b" },
  ];

  const done = () => {
    setKind(null);
    invalidate("/api/");
    onDone();
  };
  const back = () => setKind(null);

  const pick = (k: Kind) => {
    if (k === "cafe") {
      onClose();
      router.push("/cafe");
      return;
    }
    setKind(k);
  };

  return (
    <>
      <Modal open={open && !kind} onClose={onClose} title="Record a sale" description="What are you selling?" size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.filter((o) => o.show !== false).map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => pick(o.kind)}
              className="group flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm" style={{ background: o.color }}>
                <o.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg leading-snug font-semibold text-ink">{o.title}</span>
                <span className="mt-1 block text-sm text-muted">{o.text}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <MemberFormModal open={open && kind === "new"} onClose={back} onSaved={done} />
      <SellMembershipModal open={open && kind === "renew"} onClose={back} onDone={done} />
      <SellPtModal open={open && kind === "pt"} onClose={back} onDone={done} />
      <ChargeExtraModal open={open && kind === "extra"} onClose={back} onDone={done} />
      <RecordPaymentModal open={open && kind === "other"} onClose={back} onDone={done} />
    </>
  );
}
