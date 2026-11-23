"use client";
import { Field, Select } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { ROLE_LABEL, type Role } from "@/lib/permissions";
import { SOURCES, SOURCE_LABEL } from "@/lib/sources";

type Seller = { id: string; name: string; role: Role };

/** Everyone who can be picked as "Sold by" (kept in sync with the Staff page). */
export function useSellers() {
  const { data } = useApi<{ staff: Seller[] }>("/api/staff/sellers");
  return data?.staff ?? [];
}

/** "Sold by" dropdown: your staff, or None. */
export function SoldBySelect({ value, onChange, label = "Sold by", hint }: { value: string; onChange: (v: string) => void; label?: string; hint?: string }) {
  const sellers = useSellers();
  return (
    <Field label={label} hint={hint ?? "Who closed the sale. Counts on the Sales board."}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">None</option>
        {sellers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({ROLE_LABEL[s.role]})
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** "How did they find us?" dropdown: walk-in, WhatsApp lead, Instagram... */
export function SourceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="How did they find us?" hint="Optional">
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Not recorded</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {SOURCE_LABEL[s]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
