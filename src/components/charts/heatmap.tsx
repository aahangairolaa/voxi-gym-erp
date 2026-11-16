"use client";
import { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Busy-hours grid: rows = weekdays, columns = hours (5am → 11pm). */
export function Heatmap({ grid, fromHour = 5, toHour = 23 }: { grid: number[][]; fromHour?: number; toHour?: number }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const hours = Array.from({ length: toHour - fromHour + 1 }, (_, i) => fromHour + i);
  const max = Math.max(1, ...grid.flat());
  const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="min-w-[560px]">
        <div className="mb-1.5 ml-10 grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0,1fr))` }}>
          {hours.map((h) => (
            <span key={h} className="text-center text-[10px] text-muted">
              {h % 2 === 1 ? fmtHour(h) : ""}
            </span>
          ))}
        </div>
        {grid.map((row, d) => (
          <div key={d} className="mb-1 flex items-center gap-2">
            <span className="w-8 text-right text-[11px] text-muted">{DAYS[d]}</span>
            <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0,1fr))` }}>
              {hours.map((h) => {
                const v = row[h] ?? 0;
                const t = v / max;
                return (
                  <div
                    key={h}
                    onMouseEnter={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    className="aspect-square rounded-[5px] transition-transform duration-150 hover:scale-125"
                    style={{
                      background: v === 0 ? "var(--surface-2)" : `rgba(106, 68, 242, ${0.12 + t * 0.88})`,
                    }}
                    title={`${DAYS[d]} ${fmtHour(h)}: ${v} check-ins`}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <p className="mt-3 h-4 text-xs text-muted">
          {hover ? (
            <>
              <span className="font-semibold text-ink">{grid[hover.d]?.[hover.h] ?? 0} check-ins</span> on {DAYS[hover.d]}s at {fmtHour(hover.h)}m
            </>
          ) : (
            "Darker = busier. Hover a square for details."
          )}
        </p>
      </div>
    </div>
  );
}
