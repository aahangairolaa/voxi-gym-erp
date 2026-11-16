"use client";
import { useState } from "react";

type Slice = { label: string; value: number; color: string };

/** Ring chart with a legend. */
export function Donut({
  data,
  size = 168,
  centerLabel,
  format = (n: number) => n.toLocaleString("en"),
}: {
  data: Slice[];
  size?: number;
  centerLabel?: string;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-5 @[400px]:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={16} />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={hover === i ? 20 : 16}
                strokeDasharray={`${Math.max(0, len - 3)} ${c}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-2xl font-semibold text-ink tabular-nums">{format(active ? active.value : total)}</p>
            <p className="text-[11px] text-muted">{active ? active.label : centerLabel ?? "Total"}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {data.map((d, i) => (
          <li
            key={d.label}
            className="flex items-center gap-2.5 text-sm"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-soft">{d.label}</span>
            <span className="font-semibold text-ink tabular-nums">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
