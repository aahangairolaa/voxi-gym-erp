"use client";
import { useEffect, useState } from "react";
import { COUNTRY_OPTIONS, joinPhone, splitPhone } from "@/lib/countries";
import { phoneDigitsFor, phoneDigitsLabel } from "@/lib/validate";
import { cn } from "@/lib/utils";

/**
 * Phone number with a country code picker (every country, Qatar first).
 * Only digits can be typed, and no more than the chosen country's numbers have
 * (Qatar 8, India 10 ...). value / onChange use one string like "+974 55123456".
 */
export function PhoneInput({
  value,
  onChange,
  placeholder,
  className,
  id,
  required,
  invalid,
  onBlur,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
}) {
  const [dial, setDial] = useState(() => splitPhone(value)[0]);
  const [number, setNumber] = useState(() => splitPhone(value)[1].replace(/\D/g, ""));

  // Follow outside changes (e.g. the form being reset or another record loaded)
  useEffect(() => {
    if (joinPhone(dial, number) !== (value ?? "").trim()) {
      const [d, n] = splitPhone(value);
      setDial(d);
      setNumber(n.replace(/\D/g, ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const [, max] = phoneDigitsFor(dial);
  // A leading 0 (local trunk prefix) is allowed one extra digit outside Qatar
  const limit = number.startsWith("0") && dial !== "974" ? max + 1 : max;

  return (
    <div
      className={cn(
        "phone-box flex rounded-xl border border-line bg-surface transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-[var(--ring)]",
        invalid && "border-rose-500",
        className,
      )}
    >
      <select
        aria-label="Country code"
        value={dial}
        onChange={(e) => {
          const d = e.target.value;
          const [, m] = phoneDigitsFor(d);
          const n = number.slice(0, m + 1);
          setDial(d);
          setNumber(n);
          onChange(joinPhone(d, n));
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
        inputMode="numeric"
        autoComplete="tel-national"
        required={required}
        aria-invalid={invalid || undefined}
        value={number}
        maxLength={limit}
        placeholder={placeholder ?? (dial === "974" ? "55123456" : `${phoneDigitsLabel(dial)}`)}
        onBlur={onBlur}
        onChange={(e) => {
          // Digits only. Pasting "+974 5512 3456" or "5512-3456" keeps just the number.
          let raw = e.target.value;
          if (raw.trim().startsWith("+") || raw.trim().startsWith("00")) {
            const [, rest] = splitPhone(raw.trim().replace(/^00/, "+"));
            raw = rest;
          }
          const digits = raw.replace(/\D/g, "");
          const n = digits.slice(0, digits.startsWith("0") && dial !== "974" ? max + 1 : max);
          setNumber(n);
          onChange(joinPhone(dial, n));
        }}
        className="h-10 min-w-0 flex-1 rounded-r-xl bg-transparent px-3 text-sm tracking-wide text-ink tabular-nums outline-none placeholder:tracking-normal placeholder:text-muted/50"
      />
    </div>
  );
}
