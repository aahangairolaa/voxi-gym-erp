import Link from "next/link";
import { VoxiOrb } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <VoxiOrb size={64} className="mx-auto animate-float drop-shadow-[0_10px_30px_rgba(124,92,255,0.6)]" />
        <h1 className="mt-6 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted">This page doesn’t exist or was moved.</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold text-white brand-gradient">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
