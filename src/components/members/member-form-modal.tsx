"use client";
import { PhoneInput } from "@/components/ui/phone-input";
import { useEffect, useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { invalidate } from "@/hooks/use-api";
import { useForm } from "@/hooks/use-form";
import { useBranches, usePlans } from "@/hooks/use-lookups";
import { api, fieldErrors } from "@/lib/api-client";
import { collectErrors, dobBounds, dobError, emailError, nameError, phoneError, qidError } from "@/lib/validate";
import { NATIONALITIES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { formatQAR } from "@/lib/format";
import type { MemberDetail } from "@/types/api";
import { PaymentMethodPicker } from "./payment-fields";
import { PhotoInput } from "./photo-input";
import { PlanChooser } from "./plan-chooser";
import { cn } from "@/lib/utils";
import { SoldBySelect, SourceSelect } from "@/components/sales/sold-by-fields";

const empty = {
  firstName: "", lastName: "", phone: "+974 ", email: "", gender: "", dateOfBirth: "", qid: "", nationality: "",
  emergencyName: "", emergencyPhone: "", notes: "", branchId: "", source: "", soldById: "",
};

/** Create a new member (optionally selling a plan right away) or edit an existing one. */
export function MemberFormModal({
  open,
  onClose,
  member,
  onSaved,
  presetPtOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  member?: MemberDetail | null;
  onSaved?: (id: string) => void;
  /** Open a new member already set to "Personal training only" (from the PT page) */
  presetPtOnly?: boolean;
}) {
  const toast = useToast();
  const plans = usePlans();
  const branches = useBranches();
  const form = useForm(empty);
  const [planId, setPlanId] = useState("");
  const [ptOnly, setPtOnly] = useState(false);
  const [method, setMethod] = useState("CARD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false); // after the first save attempt, problems update as you type
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  // photo: shown value (URL or new data URL); photoChange: what to send (undefined = keep)
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoChange, setPhotoChange] = useState<string | null | undefined>(undefined);
  const editing = !!member;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTried(false);
    setServerFields({});
    setPlanId("");
    setPtOnly(member?.ptOnly ?? presetPtOnly);
    setPhoto(member?.photoUrl ?? null);
    setPhotoChange(undefined);
    if (member) {
      form.reset({
        firstName: member.firstName, lastName: member.lastName, phone: member.phone, email: member.email ?? "",
        gender: member.gender ?? "", dateOfBirth: member.dateOfBirth ? toDateInput(new Date(member.dateOfBirth)) : "", qid: member.qid ?? "",
        nationality: member.nationality ?? "", emergencyName: member.emergencyName ?? "", emergencyPhone: member.emergencyPhone ?? "",
        notes: member.notes ?? "", branchId: member.branchId ?? "", source: member.source ?? "", soldById: member.soldById ?? "",
      });
    } else form.reset(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member]);

  const plan = plans.find((p) => p.id === planId);
  const v0 = form.values;
  const problems = collectErrors({
    firstName: nameError(v0.firstName, "First name"),
    lastName: nameError(v0.lastName, "Last name"),
    phone: phoneError(v0.phone),
    email: emailError(v0.email, false),
    gender: v0.gender ? null : "Choose male or female",
    dateOfBirth: dobError(v0.dateOfBirth),
    qid: qidError(v0.qid, true),
    emergencyName: v0.emergencyName.trim() ? nameError(v0.emergencyName, "Contact name", false) : null,
    emergencyPhone: phoneError(v0.emergencyPhone, false),
  });
  const err = (k: string) => (tried ? (problems[k] ?? serverFields[k]) : serverFields[k]) ?? null;
  const bounds = dobBounds();

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setTried(true);
    setServerFields({});
    if (Object.keys(problems).length) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    setError(null);
    const v = form.values;
    const body = {
      ...v,
      gender: v.gender || null,
      dateOfBirth: v.dateOfBirth || null,
      branchId: v.branchId || null,
      source: v.source || null,
      soldById: v.soldById || null,
      ptOnly,
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
          planId: ptOnly ? null : planId || null,
          amountPaid: plan ? plan.price : 0,
          paymentMethod: method,
        });
        toast("success", `Member ${created.code} created`);
        invalidate("/api/");
        onSaved?.(created.id);
      }
      onClose();
    } catch (e) {
      setServerFields(fieldErrors(e));
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
            <Field label="First name" required error={err("firstName")}>
              <Input {...form.bind("firstName")} autoFocus={!editing} maxLength={60} autoComplete="off" />
            </Field>
            <Field label="Last name" required error={err("lastName")}>
              <Input {...form.bind("lastName")} maxLength={60} autoComplete="off" />
            </Field>
            <Field label="Mobile" required error={err("phone")}>
              <PhoneInput value={form.values.phone} invalid={!!err("phone")} onChange={(v) => form.set("phone", v)} />
            </Field>
            <Field label="Email" hint="Optional" error={err("email")}>
              <Input type="email" inputMode="email" {...form.bind("email")} maxLength={254} placeholder="name@example.com" />
            </Field>
            <Field label="Gender" required error={err("gender")}>
              <Select {...form.bind("gender")}>
                <option value="">Choose</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
            </Field>
            <Field label="Date of birth" required hint="Members must be 10 or older" error={err("dateOfBirth")}>
              <Input type="date" {...form.bind("dateOfBirth")} max={bounds.max} min={bounds.min} />
            </Field>
            <Field label="QID number" required hint="Qatar ID, 11 digits" error={err("qid")}>
              <Input
                value={form.values.qid}
                onChange={(e) => form.set("qid", e.target.value.replace(/\D/g, "").slice(0, 11))}
                inputMode="numeric"
                maxLength={11}
              />
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
          <p className="mb-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Joining</p>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {[
              { v: false, title: "Gym membership", text: "Uses the gym on a plan" },
              { v: true, title: "Personal training only", text: "No membership, trains with a PT" },
            ].map((o) => (
              <button
                key={o.title}
                type="button"
                onClick={() => setPtOnly(o.v)}
                aria-pressed={ptOnly === o.v}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  ptOnly === o.v ? "border-brand-400 bg-brand-50/70 ring-2 ring-brand-500/15 dark:border-brand-500/50 dark:bg-brand-500/10" : "border-line hover:border-brand-300",
                )}
              >
                <span className="block text-sm font-semibold text-ink">{o.title}</span>
                <span className="block text-xs text-muted">{o.text}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SoldBySelect value={form.values.soldById} onChange={(v) => form.set("soldById", v)} />
            <SourceSelect value={form.values.source} onChange={(v) => form.set("source", v)} />
          </div>
          {ptOnly && !editing && (
            <p className="mt-3 rounded-xl bg-surface-2/70 px-3 py-2 text-xs text-muted">
              After saving, sell their PT package on the Personal Training page. PT clients can check in while their package has sessions left.
            </p>
          )}
        </section>
        <section>
          <p className="mb-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Emergency & notes</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emergency contact" hint="Optional" error={err("emergencyName")}>
              <Input {...form.bind("emergencyName")} maxLength={80} />
            </Field>
            <Field label="Emergency phone" hint="Optional" error={err("emergencyPhone")}>
              <PhoneInput value={form.values.emergencyPhone} invalid={!!err("emergencyPhone")} onChange={(v) => form.set("emergencyPhone", v)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2" hint="Injuries, preferences, corporate deal…">
              <Textarea rows={2} {...form.bind("notes")} />
            </Field>
          </div>
        </section>
        {!editing && !ptOnly && (
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
