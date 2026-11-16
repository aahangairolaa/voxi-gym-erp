"use client";
import { useEffect, useState } from "react";
import { Button, Field, Input, Modal, useToast } from "@/components/ui";
import { invalidate } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { SearchResult } from "@/types/api";
import { MemberPicker } from "./member-picker";
import { PaymentMethodPicker } from "./payment-fields";

/** Record any payment: outstanding balance, PT session, retail, day pass… */
export function RecordPaymentModal({
  open,
  onClose,
  member,
  membershipId,
  defaultAmount,
  defaultDescription,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  member?: SearchResult | null;
  membershipId?: string | null;
  defaultAmount?: number;
  defaultDescription?: string;
  onDone?: () => void;
}) {
  const toast = useToast();
  const [who, setWho] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("CARD");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWho(member ?? null);
      setAmount(defaultAmount ?? 0);
      setDescription(defaultDescription ?? "");
      setReference("");
      setMethod("CARD");
      setError(null);
    }
  }, [open, member, defaultAmount, defaultDescription]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/payments", {
        memberId: who?.id ?? null,
        membershipId: membershipId ?? null,
        amount,
        method,
        description: description || null,
        reference: reference || null,
      });
      invalidate("/api/");
      toast("success", "Payment recorded");
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
      title="Record payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={amount <= 0}>
            Save payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Member" hint="Optional for walk-in sales">
          <MemberPicker value={who} onChange={setWho} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (QAR)" required>
            <Input type="number" min={1} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} placeholder="0" />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Single PT session" />
          </Field>
        </div>
        <div>
          <span className="label">Payment method</span>
          <PaymentMethodPicker value={method} onChange={setMethod} />
        </div>
        {method !== "CASH" && (
          <Field label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Slip / transfer reference" />
          </Field>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      </div>
    </Modal>
  );
}
