"use client";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** Label + input + optional hint/error, stacked. */
export function Field({
  label,
  hint,
  error,
  className,
  children,
  required,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className={cn("block", className)} data-invalid={error ? "" : undefined}>
      {label && (
        <span className="label">
          {label}
          {required && <span className="ml-0.5 text-brand-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {error}
        </span>
      )}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn("input", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn("input", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn("input", className)} {...props}>
      {children}
    </select>
  );
});

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-sm text-ink-soft"
    >
      <span
        className={cn(
          "relative h-6 w-10 rounded-full transition-colors duration-300",
          checked ? "bg-brand-500" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-out",
            checked && "translate-x-4",
          )}
        />
      </span>
      {label}
    </button>
  );
}

/** Pill-style switcher: <Segmented value={v} onChange={setV} options={[{value:"week",label:"Week"}]} /> */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto no-scrollbar rounded-xl border border-line bg-surface-2/70 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200",
            value === o.value
              ? "bg-surface text-ink shadow-sm ring-1 ring-line dark:bg-surface-3"
              : "text-muted hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span
              className={cn(
                "rounded-md px-1.5 py-px text-[10px] tabular-nums",
                value === o.value ? "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200" : "bg-surface-3 text-muted",
              )}
            >
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
