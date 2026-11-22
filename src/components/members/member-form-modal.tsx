"use client";
import { PhoneInput } from "@/components/ui/phone-input";
import { useEffect, useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { invalidate } from "@/hooks/use-api";
import { useForm } from "@/hooks/use-form";
import { useBranches, usePlans } from "@/hooks/use-lookups";
import { api } from "@/lib/api-client";
import { NATIONALITIES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { formatQAR } from "@/lib/format";
import type { MemberDetail } from "@/types/api";
import { PaymentMethodPicker } from "./payment-fields";
import { PhotoInput } from "./photo-input";
import { PlanChooser } from "./plan-chooser";

const empty = {
  firstName: "", lastName: "", phone: "+974 ", email: "", gender: "", dateOfBirth: "", qid: "", nationality: "",
  emergencyName: "", emergencyPhone: "", notes: "", branchId: "",
};

/** Create a new member (optionally selling a plan right away) or edit an existing one. */
export function MemberFormModal({
  open,
  onClose,
  member,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  member?: MemberDetail | null;
  onSaved?: (id: string) => void;
}) {
  const toast = useToast();
  const plans = usePlans();
  const branches = useBranches();
  const form = useForm(empty);
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState("CARD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // photo: shown value (URL or new data URL); photoChange: what to send (undefined = keep)
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoChange, setPhotoChange] = useState<string | null | undefined>(undefined);
  const editing = !!member;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPlanId("");
    setPhoto(member?.photoUrl ?? null);
    setPhotoChange(undefined);
    if (member) {
      form.reset({
        firstName: member.firstName, lastName: member.lastName, phone: member.phone, email: member.email ?? "",
        gender: member.gender ?? "", dateOfBirth: member.dateOfBirth ? toDateInput(new Date(member.dateOfBirth)) : "", qid: member.qid ?? "",
        nationality: member.nationality ?? "", emergencyName: member.emergencyName ?? "", emergencyPhone: member.emergencyPhone ?? "",
        notes: member.notes ?? "", branchId: member.branchId ?? "",
      });
    } else form.reset(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member]);

  const plan = plans.find((p) => p.id === planId);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    const v = form.values;
    const body = {
      ...v,
      gender: v.gender || null,
      dateOfBirth: v.dateOfBirth || null,
      branchId: v.branchId || null,
      ...(photoChange !== undefined ? { photo: photoChange } : {}),
    };
    try {
      if (editing) {
        await api.put(`/api/members/${member!.id}`, body);
        toast("success", "Member updated");
        invalidate("/api/");
        onSaved?.(member!.id);
      } else {
        const created = await api.post<{ id: string; code: string }>("/api/members", {
          ...body,
          planId: planId || null,
          amountPaid: plan ? plan.price : 0,
          paymentMethod: method,
        });
        toast("success", `Member ${created.code} created`);
        invalidate("/api/");
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit ${member!.name}` : "New member"}
      description={editing ? member!.code : "Add the member’s details. You can sell a plan now or later."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => submit()} loading={saving}>
            {editing ? "Save changes" : plan ? `Create & charge ${formatQAR(plan.price)}` : "Create member"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <section>
          <PhotoInput
            name={`${form.values.firstName} ${form.values.lastName}`.trim()}
            value={photo}
            onChange={(v) => {
              setPhoto(v);
              setPhotoChange(v);
            }}
          />
        </section>
        <section>
          <p className="mb-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Personal</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <Input {...form.bind("firstName")} autoFocus={!editing} />
            </Field>
            <Field label="Last name (optional)">
              <Input {...form.bind("lastName")} />
            </Field>
            <Field label="Mobile" required>
              <PhoneInput value={form.values.phone} onChange={(v) => form.set("phone", v)} />
            </Field>
            <Field label="Email">
              <Input type="email" {...form.bind("email")} />
            </Field>
            <Field label="Gender">
              <Select {...form.bind("gender")}>
                <option value="">Not set</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
            </Field>
            <Field label="Date of birth" hint="Members must be 10 or older">
              <Input type="date" {...form.bind("dateOfBirth")} max={toDateInput(new Date(Date.now() - 10 * 365.25 * 86_400_000))} min="1900-01-01" />
            </Field>
            <Field label="QID number" hint="Qatar ID, 11 digits">
              <Input {...form.bind("qid")} inputMode="numeric" maxLength={11} />
            </Field>
            <Field label="Nationality">
              <Select {...form.bind("nationality")}>
                <option value="">Not set</option>
                {NATIONALITIES.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </Select>
            </Field>
            <Field label="Home branch">
              <Select {...form.bind("branchId")}>
                <option value="">Not set</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </section>
        <section>
          <p className="mb-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Emergency & notes</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emergency contact">
              <Input {...form.bind("emergencyName")} />
            </Field>
            <Field label="Emergency phone">
              <PhoneInput value={form.values.emergencyPhone} onChange={(v) => form.set("emergencyPhone", v)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2" hint="Injuries, preferences, corporate deal…">
              <Textarea rows={2} {...form.bind("notes")} />
            </Field>
          </div>
        </section>
        {!editing && (
          <section>
            <p className="mb-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Membership (optional)</p>
            <PlanChooser plans={plans} value={planId} onChange={(id) => setPlanId(id === planId ? "" : id)} />
            {plan && (
              <div className="mt-4">
                <span className="label">Payment method</span>
                <PaymentMethodPicker value={method} onChange={setMethod} />
              </div>
            )}
          </section>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
