"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** The VOXI orb — a glass sphere split by a wave (vector version of the logo). */
export function VoxiOrb({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <radialGradient id={`o-${id}`} cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#c9b8ff" />
          <stop offset="38%" stopColor="#7c5cff" />
          <stop offset="78%" stopColor="#3b1fa3" />
          <stop offset="100%" stopColor="#1f0f63" />
        </radialGradient>
        <linearGradient id={`w-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#d9ccff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill={`url(#o-${id})`} />
      {/* lower half lit by the wave */}
      <path d="M2.4 21.5C8 22.6 11.5 15 19.5 15.6S29.8 25.4 37.6 18.6A18 18 0 0 1 2.4 21.5Z" fill={`url(#w-${id})`} />
      <path d="M2.6 21.6C8 22.6 11.5 15 19.5 15.6S29.8 25.4 37.4 18.8" fill="none" stroke="#fff" strokeOpacity="0.95" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="13.5" cy="9.5" rx="6" ry="3" fill="#fff" opacity="0.28" transform="rotate(-28 13.5 9.5)" />
      <circle cx="20" cy="20" r="17.4" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />
    </svg>
  );
}

/** Wordmark: V ◉ X I */
export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: { text: "text-lg", orb: 18 }, md: { text: "text-[22px]", orb: 22 }, lg: { text: "text-4xl", orb: 36 } }[size];
  return (
    <span className={cn("inline-flex items-center font-display font-semibold tracking-[0.18em] text-ink", s.text, className)}>
      <span>V</span>
      <VoxiOrb size={s.orb} className="mx-[0.08em] drop-shadow-[0_2px_8px_rgba(124,92,255,0.55)]" />
      <span>XI</span>
    </span>
  );
}
