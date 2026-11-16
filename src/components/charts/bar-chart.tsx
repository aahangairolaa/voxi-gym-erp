"use client";
import { useState } from "react";
import { compactNumber } from "@/lib/format";
import { niceMax, useWidth } from "./use-width";

type Series = { name: string; color: string; values: number[] };

/** Vertical bars; pass several series to compare (e.g. revenue vs expenses). */
export function BarChart({
  labels,
  series,
  height = 240,
  format = (n: number) => n.toLocaleString("en"),
}: {
  labels: string[];
  series: Series[];
  height?: number;
  format?: (n: number) => string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 40, r: 8, t: 12, b: 28 };
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const group = labels.length ? w / labels.length : 0;
  const barW = Math.max(4, Math.min(26, (group * 0.62) / series.length));
  const y = (v: number) => pad.t + h - (v / max) * h;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const labelEvery = Math.ceil(labels.length / Math.max(1, Math.floor(w / 48)));

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "3 5"} />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--muted)] text-[10px] tabular-nums">
                {compactNumber(t)}
              </text>
            </g>
          ))}
          {labels.map((label, i) => {
            const gx = pad.l + i * group + (group - barW * series.length - (series.length - 1) * 3) / 2;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
                <rect x={pad.l + i * group} y={pad.t} width={group} height={h} fill={hover === i ? "var(--surface-2)" : "transparent"} rx={8} />
                {series.map((s, si) => {
                  const v = s.values[i] ?? 0;
                  const bh = Math.max(v > 0 ? 3 : 0, (v / max) * h);
                  return (
                    <rect
                      key={si}
                      x={gx + si * (barW + 3)}
                      y={pad.t + h - bh}
                      width={barW}
                      height={bh}
                      rx={Math.min(6, barW / 2)}
                      fill={s.color}
                      opacity={hover === null || hover === i ? 1 : 0.55}
                      style={{ transformOrigin: `0 ${pad.t + h}px`, animation: `fade-up .6s cubic-bezier(.22,1,.36,1) ${i * 30}ms both`, transition: "opacity .2s" }}
                    />
                  );
                })}
                {(i % labelEvery === 0 || i === labels.length - 1) && (
                  <text x={pad.l + i * group + group / 2} y={height - 8} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(pad.l + hover * group + group / 2, 70), width - 70) }}
        >
          <p className="mb-1 text-muted">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center gap-2 font-semibold text-ink tabular-nums">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {series.length > 1 && <span className="font-normal text-muted">{s.name}</span>}
              {format(s.values[hover] ?? 0)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
