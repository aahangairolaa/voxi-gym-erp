"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/** Crisp SVG QR code for any text or link. */
export function QrCode({ value, size = 200, className, dark = "#140f2e" }: { value: string; size?: number; className?: string; dark?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark, light: "#ffffff" } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [value, dark]);
  return (
    <div
      className={cn("overflow-hidden rounded-xl bg-white p-2 [&>svg]:h-full [&>svg]:w-full", className)}
      style={{ width: size, height: size }}
      // qrcode returns a plain SVG string (no user HTML)
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      role="img"
      aria-label="QR code"
    />
  );
}
