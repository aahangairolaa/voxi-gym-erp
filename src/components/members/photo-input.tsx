"use client";
import { useEffect, useRef, useState } from "react";
import { LuCamera, LuImagePlus, LuTrash2, LuX } from "react-icons/lu";
import { Avatar, Button } from "@/components/ui";
import { compressImage } from "@/lib/image";

/**
 * Member photo picker: upload a picture or take one with the webcam / phone camera.
 * value: current photo URL or data URL (null = no photo).
 * onChange(dataUrl | null) is called with a small JPEG data URL, or null to remove.
 */
export function PhotoInput({ name, value, onChange }: { name: string; value: string | null; onChange: (v: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      onChange(await compressImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that picture");
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name || "New member"} src={value} size={84} className="ring-4 ring-brand-50 dark:ring-brand-500/10" />
        <button
          type="button"
          onClick={() => setCamera(true)}
          className="absolute -right-1 -bottom-1 grid h-8 w-8 place-items-center rounded-full text-white brand-gradient shadow-lg transition hover:scale-105"
          aria-label="Take photo"
        >
          <LuCamera className="h-4 w-4" />
        </button>
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold text-ink">Profile photo</p>
        <p className="text-xs text-muted">Shown at check-in so reception can recognise the member.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            <LuImagePlus className="h-4 w-4" /> Upload
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setCamera(true)}>
            <LuCamera className="h-4 w-4" /> Camera
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <LuTrash2 className="h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {camera && (
        <CameraCapture
          onClose={() => setCamera(false)}
          onCapture={(url) => {
            onChange(url);
            setCamera(false);
          }}
          onUnavailable={() => {
            setCamera(false);
            fileRef.current?.click(); // phones without webcam access: fall back to the native camera picker
          }}
        />
      )}
    </div>
  );
}

function CameraCapture({ onClose, onCapture, onUnavailable }: { onClose: () => void; onCapture: (url: string) => void; onUnavailable: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      onUnavailable();
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().then(() => setReady(true)).catch(() => setReady(true));
        }
      })
      .catch(() => setError("Camera access was blocked. Allow the camera in your browser, or use Upload."));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snap = async () => {
    if (!videoRef.current) return;
    onCapture(await compressImage(videoRef.current));
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#0d0a1f]/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-scale-in overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="font-semibold text-ink">Take photo</p>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Close camera">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mx-5 aspect-square overflow-hidden rounded-2xl bg-[#0d0a1f]">
          <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-white/60 shadow-[0_0_0_999px_rgba(13,10,31,0.35)]" />
          {error && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 p-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={snap} disabled={!ready || !!error}>
            <LuCamera className="h-4 w-4" /> Capture
          </Button>
        </div>
      </div>
    </div>
  );
}
