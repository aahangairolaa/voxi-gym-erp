"use client";
import { useId, useState } from "react";
import { compactNumber } from "@/lib/format";
import { niceMax, useWidth } from "./use-width";

type Point = { label: string; value: number };

/** Smooth line + soft gradient fill. Hover shows the value. */
export function AreaChart({
  data,
  height = 220,
  format = (n: number) => n.toLocaleString("en"),
}: {
  data: Point[];
  height?: number;
  format?: (n: number) => string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const pad = { l: 40, r: 12, t: 16, b: 28 };
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const x = (i: number) => pad.l + (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => pad.t + h - (v / max) * h;

  // Smooth curve (monotone-ish cubic)
  const pts = data.map((d, i) => [x(i), y(d.value)] as const);
  let path = "";
  pts.forEach(([px, py], i) => {
    if (i === 0) path += `M${px},${py}`;
    else {
      const [x0, y0] = pts[i - 1]!;
      const cx = (x0 + px) / 2;
      path += ` C${cx},${y0} ${cx},${py} ${px},${py}`;
    }
  });
  const area = pts.length ? `${path} L${pts[pts.length - 1]![0]},${pad.t + h} L${pts[0]![0]},${pad.t + h} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(w / 56)));

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`line-${gid}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#9a7bff" />
              <stop offset="100%" stopColor="#5932d6" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "3 5"} />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--muted)] text-[10px] tabular-nums">
                {compactNumber(t)}
              </text>
            </g>
          ))}
          <path d={area} fill={`url(#fill-${gid})`} className="animate-fade-in" />
          <path
            d={path}
            fill="none"
            stroke={`url(#line-${gid})`}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 0, animation: "fade-in .8s ease-out both" }}
          />
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">
                {d.label}
              </text>
            ) : null,
          )}
          {data.map((_, i) => (
            <rect
              key={i}
              x={x(i) - w / Math.max(1, data.length - 1) / 2}
              y={pad.t}
              width={w / Math.max(1, data.length - 1)}
              height={h}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
          ))}
          {hover !== null && pts[hover] && (
            <g pointerEvents="none">
              <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={pad.t + h} stroke="#7c5cff" strokeOpacity="0.35" />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} fill="var(--surface)" stroke="#6a44f2" strokeWidth={2.5} />
            </g>
          )}
        </svg>
      )}
      {hover !== null && pts[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(pts[hover][0], 60), width - 60), top: pts[hover][1] - 10 }}
        >
          <p className="text-muted">{data[hover]!.label}</p>
          <p className="font-semibold text-ink tabular-nums">{format(data[hover]!.value)}</p>
        </div>
      )}
    </div>
  );
}
