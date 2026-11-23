"use client";
import { useEffect, useState } from "react";
import { Button, Field, Input, Modal, useToast } from "@/components/ui";
import { invalidate } from "@/hooks/use-api";
import { usePlans } from "@/hooks/use-lookups";
import { api } from "@/lib/api-client";
import { formatQAR } from "@/lib/format";
import type { SearchResult } from "@/types/api";
import { MemberPicker } from "./member-picker";
import { PaymentMethodPicker } from "./payment-fields";
import { PlanChooser } from "./plan-chooser";
import { SoldBySelect } from "@/components/sales/sold-by-fields";

/** Sell a new plan or renew an existing member — records the payment too. */
export function SellMembershipModal({
  open,
  onClose,
  member,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  member?: SearchResult | null;
  onDone?: () => void;
}) {
  const plans = usePlans();
  const toast = useToast();
  const [who, setWho] = useState<SearchResult | null>(member ?? null);
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState<number | null>(null);
  const [method, setMethod] = useState("CARD");
  const [reference, setReference] = useState("");
  const [soldById, setSoldById] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWho(member ?? null);
      setPlanId("");
      setStartDate("");
      setDiscount(0);
      setAmountPaid(null);
      setMethod("CARD");
      setReference("");
      setSoldById("");
      setError(null);
    }
  }, [open, member]);

  const plan = plans.find((p) => p.id === planId);
  const due = Math.max(0, (plan?.price ?? 0) - discount);
  const paying = Math.min(amountPaid ?? due, due); // never more than what is due

  const submit = async () => {
    if (!who || !plan) return setError("Choose a member and a plan.");
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/memberships", {
        memberId: who.id,
        planId: plan.id,
        startDate: startDate || null,
        discount,
        amountPaid: paying,
        paymentMethod: method,
        reference: reference || null,
        soldById: soldById || null,
      });
      invalidate("/api/");
      toast("success", `${plan.name} sold to ${who.name}`);
      onDone?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Sell / renew membership"
      description="Renewals start the day after the current plan ends, unless you pick a start date."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!who || !plan}>
            Confirm · {formatQAR(paying)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Member" required>
          <MemberPicker value={who} onChange={setWho} autoFocus={!member} />
        </Field>
        <div>
          <span className="label">Plan</span>
          <PlanChooser plans={plans} value={planId} onChange={setPlanId} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Start date" hint="Leave empty for automatic">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Discount (QAR)">
            <Input type="number" min={0} value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} placeholder="0" />
          </Field>
          <Field label="Amount paid now (QAR)" hint={paying < due ? `Balance ${formatQAR(due - paying)} will remain` : undefined}>
            <Input type="number" min={0} max={due} value={paying} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} />
          </Field>
        </div>
        <div>
          <span className="label">Payment method</span>
          <PaymentMethodPicker value={method} onChange={setMethod} />
        </div>
        <SoldBySelect value={soldById} onChange={setSoldById} />
        {method !== "CASH" && (
          <Field label="Reference" hint="Card slip no., Fawran or transfer reference (optional)">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        )}
        {plan && (
          <div className="rounded-2xl border border-line bg-surface-2/60 p-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>{plan.name}</span>
              <span className="tabular-nums">{formatQAR(plan.price)}</span>
            </div>
            {discount > 0 && (
              <div className="mt-1 flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="tabular-nums">− {formatQAR(discount)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold text-ink">
              <span>Total due</span>
              <span className="tabular-nums">{formatQAR(due)}</span>
            </div>
          </div>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      </div>
    </Modal>
  );
}
