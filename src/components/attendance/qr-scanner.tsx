"use client";
import { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { Button } from "@/components/ui";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/**
 * True when this device has a camera VOXI can use. Browsers with a built-in QR reader
 * (Chrome on Android/Mac, Edge) use it; the rest (Safari, Firefox, Chrome on Windows)
 * use a small JavaScript reader instead.
 */
export function canScanQr() {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
}

/** Read a QR code from the current video frame without BarcodeDetector. */
type FrameReader = (v: HTMLVideoElement) => Promise<string | null>;
async function jsReader(): Promise<FrameReader> {
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return async (v) => {
    // Scale down big camera frames: faster, and QR cards still read well
    const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

/**
 * Full-screen camera that reads a member's QR card and calls onScan(text) once.
 * Desks with a USB/Bluetooth QR scanner don't need this — the scanner "types"
 * the code into the check-in box and presses Enter.
 */
export function QrScanner({
  onScan,
  onClose,
  facing = "environment",
}: {
  onScan: (text: string) => void;
  onClose: () => void;
  /** "user" = the screen-side camera (self check-in tablets) */
  facing?: "environment" | "user";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const Detector = window.BarcodeDetector;
    // Built-in reader where the browser has one, otherwise the JavaScript reader
    const readerReady: Promise<FrameReader> = Detector
      ? Promise.resolve(new Detector({ formats: ["qr_code"] })).then((d) => async (v: HTMLVideoElement) => (await d.detect(v).catch(() => []))[0]?.rawValue ?? null)
      : jsReader();

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const read = await readerReady;
        const v = videoRef.current!;
        v.srcObject = s;
        await v.play().catch(() => {});
        const tick = async () => {
          if (stopped || done.current) return;
          if (v.readyState >= 2) {
            const text = await read(v).catch(() => null);
            if (text && !done.current) {
              done.current = true;
              navigator.vibrate?.(60);
              onScan(text);
              return;
            }
          }
          raf = window.setTimeout(() => requestAnimationFrame(tick), 180) as unknown as number;
        };
        tick();
      })
      .catch(() => setError("Camera access was blocked. Allow the camera for this site and try again."));

    return () => {
      stopped = true;
      clearTimeout(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0d0a1f]">
      <div className="flex items-center justify-between px-5 py-4 text-white">
        <p className="font-semibold">Scan member card</p>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close scanner">
          <LuX className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="relative aspect-square w-[min(70vw,320px)] rounded-3xl shadow-[0_0_0_9999px_rgba(13,10,31,0.55)]">
            <span className="absolute inset-0 rounded-3xl border-2 border-white/80" />
            <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse bg-brand-400 shadow-[0_0_16px_rgba(124,92,255,0.9)]" />
          </div>
        </div>
        {error && <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl bg-black/70 p-4 text-center text-sm text-white">{error}</p>}
      </div>
      <div className="p-5 text-center">
        <p className="mb-3 text-xs text-white/60">Hold the member’s QR card inside the square</p>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
