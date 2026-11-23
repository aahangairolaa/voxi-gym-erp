"use client";
import { useEffect, useState } from "react";
import { Button, Field, Modal, useToast } from "@/components/ui";
import { MemberPicker } from "@/components/members/member-picker";
import { PaymentMethodPicker } from "@/components/members/payment-fields";
import { SoldBySelect } from "@/components/sales/sold-by-fields";
import { invalidate, useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { formatQAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/api";

type Extra = { id: string; name: string; price: number; active: boolean };

/** Charge a towel, sauna session or any other extra to a member or a walk-in. */
export function ChargeExtraModal({ open, onClose, onDone, onManage }: { open: boolean; onClose: () => void; onDone: () => void; onManage?: () => void }) {
  const toast = useToast();
  const { data } = useApi<{ items: Extra[] }>(open ? "/api/extras" : null);
  const items = (data?.items ?? []).filter((i) => i.active);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [member, setMember] = useState<SearchResult | null>(null);
  const [method, setMethod] = useState("CASH");
  const [soldById, setSoldById] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setItemId("");
      setQty(1);
      setMember(null);
      setMethod("CASH");
      setSoldById("");
    }
  }, [open]);

  const item = items.find((i) => i.id === itemId);
  const total = (item?.price ?? 0) * qty;

  const charge = async () => {
    if (!item) return toast("error", "Choose what you're charging for");
    setBusy(true);
    try {
      await api.post("/api/extras/charge", { extraItemId: item.id, quantity: qty, memberId: member?.id ?? null, method, soldById: soldById || null });
      invalidate("/api/");
      toast("success", `Charged ${formatQAR(total)} for ${qty > 1 ? `${qty} × ` : ""}${item.name}`);
      onDone();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Couldn't charge");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Charge an extra"
      description="Towel, sauna, locker and anything else on your extras price list. It's added to today's sales."
      footer={
        <Button onClick={charge} loading={busy} disabled={!item}>
          Charge {item ? formatQAR(total) : ""}
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">What for</span>
            {onManage && (
              <button type="button" onClick={onManage} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Edit price list
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">No extras yet. {onManage ? "Add some in the price list." : "Ask a manager to add them."}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setItemId(i.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    itemId === i.id ? "border-brand-400 bg-brand-50/70 ring-2 ring-brand-500/15 dark:border-brand-500/50 dark:bg-brand-500/10" : "border-line hover:border-brand-300",
                  )}
                >
                  <span className="block text-sm font-semibold text-ink">{i.name}</span>
                  <span className="block text-xs text-muted tabular-nums">QAR {i.price}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How many">
            <div className="flex h-10 items-center rounded-xl border border-line">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-full px-3 text-lg text-muted hover:text-ink" aria-label="One less">
                −
              </button>
              <span className="flex-1 text-center font-semibold tabular-nums">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(100, q + 1))} className="h-full px-3 text-lg text-muted hover:text-ink" aria-label="One more">
                +
              </button>
            </div>
          </Field>
          <SoldBySelect value={soldById} onChange={setSoldById} hint="Optional" />
        </div>
        <Field label="Member" hint="Leave empty for a walk-in guest">
          <MemberPicker value={member} onChange={setMember} />
        </Field>
        <div>
          <span className="label">Payment method</span>
          <PaymentMethodPicker value={method} onChange={setMethod} />
        </div>
      </div>
    </Modal>
  );
}
