/** Horizontal bars with labels — great for "revenue by payment method". */
export function BarsList({
  data,
  format = (n: number) => n.toLocaleString("en"),
  color = "linear-gradient(90deg,#9a7bff,#6a44f2)",
  onSelect,
  selected,
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
  color?: string;
  /** Make each row clickable (e.g. to filter a list by it) */
  onSelect?: (label: string) => void;
  selected?: string | null;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={d.label}>
          {(() => {
            const body = (
              <>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className={selected === d.label ? "truncate font-semibold text-brand-700 dark:text-brand-300" : "truncate text-ink-soft"}>{d.label}</span>
                  <span className="font-semibold text-ink tabular-nums">{format(d.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(d.value / max) * 100}%`, background: color, opacity: selected && selected !== d.label ? 0.35 : 1, animation: `fade-in .6s ease-out ${i * 60}ms both` }}
                  />
                </div>
              </>
            );
            return onSelect ? (
              <button type="button" onClick={() => onSelect(d.label)} aria-pressed={selected === d.label} className="-mx-2 block w-[calc(100%+1rem)] rounded-xl px-2 py-1 text-left transition hover:bg-surface-2">
                {body}
              </button>
            ) : (
              body
            );
          })()}
        </li>
      ))}
    </ul>
  );
}
