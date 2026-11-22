"use client";
import { PhoneInput } from "@/components/ui/phone-input";
import { useEffect, useRef, useState } from "react";
import { LuImagePlus, LuStore, LuTrash2 } from "react-icons/lu";
import { Button, Card, CardHeader, Field, Input, Skeleton, Textarea, useToast } from "@/components/ui";
import { api } from "@/lib/api-client";
import { compressImage } from "@/lib/image";
import type { Settings } from "@/types/api";

const COLORS = ["#6A44F2", "#7C5CFF", "#2563EB", "#0EA5E9", "#059669", "#D97706", "#E11D48", "#DB2777", "#111827"];

/** The gym's own profile: logo, colour, contact details and invoice settings. */
export function GymProfileCard({ settings, editable, onSaved }: { settings: Settings | undefined; editable: boolean; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Settings | null>(null);
  const [logoChange, setLogoChange] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setForm(settings);
      setLogoChange(undefined);
    }
  }, [settings]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { logo: _logo, ...rest } = form;
      await api.put("/api/settings", { ...rest, ...(logoChange !== undefined ? { logo: logoChange } : {}) });
      toast("success", "Gym profile saved. Reloading to apply your branding");
      onSaved();
      setTimeout(() => window.location.reload(), 700); // refresh sidebar logo & colours
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file || !form) return;
    try {
      const url = await compressImage(file, { size: 256, square: false, type: "image/png" });
      setForm({ ...form, logo: url });
      setLogoChange(url);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Couldn't read that image");
    }
  };

  const f = (key: keyof Settings) => ({
    value: (form?.[key] ?? "") as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      form && setForm({ ...form, [key]: key === "expiryWarnDays" ? Number(e.target.value) : e.target.value }),
    disabled: !editable,
  });

  return (
    <Card>
      <CardHeader title="Gym profile" subtitle="Your logo and details appear on invoices, member cards and WhatsApp messages" icon={<LuStore className="h-[18px] w-[18px]" />} />
      {!form ? (
        <Skeleton className="m-5 h-72" />
      ) : (
        <div className="space-y-6 px-5 pb-5">
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface-2/50 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              {form.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo} alt="Gym logo" className="h-16 w-16 rounded-2xl border border-line bg-white object-contain p-1.5" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold text-white" style={{ background: form.brandColor ?? "#6A44F2" }}>
                  {form.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              {editable && (
                <div className="flex flex-col gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                    <LuImagePlus className="h-4 w-4" /> {form.logo ? "Change logo" : "Upload logo"}
                  </Button>
                  {form.logo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setForm({ ...form, logo: null });
                        setLogoChange(null);
                      }}
                    >
                      <LuTrash2 className="h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="sm:ml-auto">
              <span className="label">Brand colour</span>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={!editable}
                    onClick={() => setForm({ ...form, brandColor: c })}
                    className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition ${form.brandColor?.toUpperCase() === c ? "ring-2 ring-ink" : "hover:scale-110"}`}
                    style={{ background: c }}
                    aria-label={`Colour ${c}`}
                  />
                ))}
                <input
                  type="color"
                  disabled={!editable}
                  value={form.brandColor ?? "#6A44F2"}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  className="h-7 w-9 cursor-pointer rounded-md border border-line bg-transparent"
                  aria-label="Custom colour"
                />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gym name" required>
              <Input {...f("name")} />
            </Field>
            <Field label="Legal name">
              <Input {...f("legalName")} placeholder="VOXI Fitness W.L.L." />
            </Field>
            <Field label="Commercial Registration (CR) no.">
              <Input {...f("crNumber")} />
            </Field>
            <Field label="Phone">
              <PhoneInput value={form?.phone ?? ""} onChange={(v) => form && setForm({ ...form, phone: v })} />
            </Field>
            <Field label="Email">
              <Input {...f("email")} />
            </Field>
            <Field label="Website">
              <Input {...f("website")} />
            </Field>
            <Field label="Instagram" hint="e.g. @voxi.qa">
              <Input {...f("instagram")} />
            </Field>
            <Field label="Opening hours" hint="e.g. Sat–Thu 5am–12am · Fri 1pm–11pm">
              <Input {...f("openingHours")} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input {...f("address")} />
            </Field>
            <Field label="Invoice prefix" hint="e.g. INV → INV-000123">
              <Input {...f("invoicePrefix")} />
            </Field>
            <Field label="“Expiring soon” warning (days)" hint="Also the renewal reminder window">
              <Input type="number" min={1} max={60} {...f("expiryWarnDays")} />
            </Field>
            <Field label="Invoice footer" className="sm:col-span-2">
              <Textarea rows={2} {...f("invoiceFooter")} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Currency: Qatari Riyal (QAR) · Time zone: Asia/Qatar (UTC+3) · Gym ID: <span className="font-mono">{form.slug}</span>
            </p>
            {editable && (
              <Button onClick={save} loading={saving}>
                Save changes
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
