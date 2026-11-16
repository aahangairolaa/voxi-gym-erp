"use client";
import { LuBanknote, LuCreditCard, LuSmartphone, LuBuilding2, LuGlobe } from "react-icons/lu";
import { PAYMENT_METHODS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS = { CASH: LuBanknote, CARD: LuCreditCard, FAWRAN: LuSmartphone, BANK_TRANSFER: LuBuilding2, ONLINE: LuGlobe };

/** Tap-to-select payment method (Cash, Card, Fawran, Bank transfer, Online). */
export function PaymentMethodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {PAYMENT_METHODS.map((m) => {
        const Icon = ICONS[m.value];
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition",
              active ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200" : "border-line text-muted hover:border-brand-200 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
