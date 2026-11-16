/** Horizontal bars with labels — great for "revenue by payment method". */
export function BarsList({
  data,
  format = (n: number) => n.toLocaleString("en"),
  color = "linear-gradient(90deg,#9a7bff,#6a44f2)",
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-ink-soft">{d.label}</span>
            <span className="font-semibold text-ink tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, background: color, animation: `fade-in .6s ease-out ${i * 60}ms both` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
