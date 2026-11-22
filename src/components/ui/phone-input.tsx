"use client";
import { useEffect, useState } from "react";
import { COUNTRY_OPTIONS, joinPhone, splitPhone } from "@/lib/countries";
import { cn } from "@/lib/utils";

/**
 * Phone number with a country code picker (every country, Qatar first).
 * value / onChange use one string like "+974 5512 3456" so nothing else has to change.
 */
export function PhoneInput({
  value,
  onChange,
  placeholder = "5512 3456",
  className,
  id,
  required,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}) {
  const [dial, setDial] = useState(() => splitPhone(value)[0]);
  const [number, setNumber] = useState(() => splitPhone(value)[1]);

  // Follow outside changes (e.g. the form being reset or another record loaded)
  useEffect(() => {
    if (joinPhone(dial, number) !== (value ?? "").trim()) {
      const [d, n] = splitPhone(value);
      setDial(d);
      setNumber(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("flex rounded-xl border border-line bg-surface transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-[var(--ring)]", className)}>
      <select
        aria-label="Country code"
        value={dial}
        onChange={(e) => {
          setDial(e.target.value);
          onChange(joinPhone(e.target.value, number));
        }}
        className="w-[108px] shrink-0 cursor-pointer appearance-none rounded-l-xl border-r border-line bg-surface-2/60 bg-[length:10px] bg-[right_8px_center] bg-no-repeat py-2 pr-6 pl-3 text-sm font-medium text-ink outline-none [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 6%22><path d=%22M1 1l4 4 4-4%22 fill=%22none%22 stroke=%22%238a86a3%22 stroke-width=%221.5%22/></svg>')]"
      >
        {COUNTRY_OPTIONS.map(([iso, name, code], i) => (
          <option key={`${iso}-${i}`} value={code} title={name}>
            {iso} +{code}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required={required}
        value={number}
        placeholder={placeholder}
        onChange={(e) => {
          const n = e.target.value.replace(/[^\d\s-]/g, "");
          setNumber(n);
          onChange(joinPhone(dial, n));
        }}
        className="h-10 min-w-0 flex-1 rounded-r-xl bg-transparent px-3 text-sm text-ink outline-none placeholder:text-muted/70"
      />
    </div>
  );
}
