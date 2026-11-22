import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names safely: cn("p-2", cond && "p-4") → "p-4" */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "James Carter" → "JC" */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Pick a stable avatar hue from any string (so each member keeps the same colour). */
export function hueFromString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return 245 + (h % 50); // keep it in the violet/indigo family
}
