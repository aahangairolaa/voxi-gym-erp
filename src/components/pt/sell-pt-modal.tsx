"use client";
import { useEffect, useState } from "react";
import { LuUserPlus } from "react-icons/lu";
import { Button, Field, Input, Modal, Select, useToast } from "@/components/ui";
import { MemberFormModal } from "@/components/members/member-form-modal";
import { MemberPicker } from "@/components/members/member-picker";
import { PaymentMethodPicker } from "@/components/members/payment-fields";
import { SoldBySelect, useSellers } from "@/components/sales/sold-by-fields";
import { invalidate } from "@/hooks/use-api";
import { api, fieldErrors } from "@/lib/api-client";
import { toDateInput } from "@/lib/dates";
import { formatQAR } from "@/lib/format";
import type { SearchResult } from "@/types/api";

/** Sell a package of personal training sessions to a member or a new PT-only client. */
export function SellPtModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  // Anyone who can coach: trainers first, then owners and managers
  const sellers = useSellers();
  const trainers = sellers.filter((s) => s.role === "TRAINER").concat(sellers.filter((s) => s.role === "OWNER" || s.role === "MANAGER"));
  const toast = useToast();
  const [member, setMember] = useState<SearchResult | null>(null);
  const [trainerId, setTrainerId] = useState("");
  const [sessions, setSessions] = useState("10");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState<string | null>(null);
  const [method, setMethod] = useState("CARD");
  const [soldById, setSoldById] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newClient, setNewClient] = useState(false);

  useEffect(() => {
    if (open) {
      setMember(null);
      setTrainerId(trainers.length === 1 ? trainers[0]!.id : "");
      setSessions("10");
      setPrice("");
      setPaid(null);
      setMethod("CARD");
      setSoldById("");
      setExpires("");
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const priceN = Number(price) || 0;
  const paying = paid === null ? priceN : Math.min(Number(paid) || 0, priceN);

  const save = async () => {
    if (!member) return toast("error", "Choose the client");
    setBusy(true);
    setErrors({});
    try {
      await api.post("/api/pt/packages", {
        memberId: member.id,
        trainerId,
        sessionsTotal: sessions,
        price: priceN,
        amountPaid: paying,
        paymentMethod: method,
        soldById: soldById || null,
        expiresAt: expires || null,
      });
      invalidate("/api/");
      toast("success", `${sessions} PT sessions sold to ${member.name}`);
      onDone();
    } catch (e) {
      setErrors(fieldErrors(e));
      toast("error", e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={open && !newClient}
        onClose={onClose}
        title="Sell a PT package"
        description="Sessions with a trainer. Works for members and for PT-only clients."
        footer={
          <Button onClick={save} loading={busy}>
            Sell package {priceN ? formatQAR(priceN) : ""}
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Client" required>
            <MemberPicker value={member} onChange={setMember} />
          </Field>
          <button type="button" onClick={() => setNewClient(true)} className="-mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
            <LuUserPlus className="h-3.5 w-3.5" /> New client (PT only, no membership)
          </button>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trainer" required error={errors.trainerId}>
              <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
                <option value="">Choose</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sessions" required error={errors.sessionsTotal}>
              <Input type="number" inputMode="numeric" min={1} max={500} value={sessions} onChange={(e) => setSessions(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Package price (QAR)" required error={errors.price}>
              <Input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Paid now (QAR)" hint={paying < priceN ? `${formatQAR(priceN - paying)} left to pay` : undefined} error={errors.amountPaid}>
              <Input type="number" inputMode="numeric" min={0} value={paid ?? price} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Use sessions by" hint="Optional expiry date">
              <Input type="date" min={toDateInput()} value={expires} onChange={(e) => setExpires(e.target.value)} />
            </Field>
            <SoldBySelect value={soldById} onChange={setSoldById} hint="Optional" />
          </div>
          {paying > 0 && (
            <div>
              <span className="label">Payment method</span>
              <PaymentMethodPicker value={method} onChange={setMethod} />
            </div>
          )}
        </div>
      </Modal>
      <MemberFormModal
        open={open && newClient}
        onClose={() => setNewClient(false)}
        presetPtOnly
        onSaved={async (id) => {
          setNewClient(false);
          try {
            const m = await api.get<{ id: string; code: string; name: string; phone: string; status: SearchResult["status"]; photoUrl: string | null }>(`/api/members/${id}`);
            setMember({ id: m.id, code: m.code, name: m.name, phone: m.phone, status: m.status, plan: null, photoUrl: m.photoUrl });
          } catch {}
        }}
      />
    </>
  );
}
