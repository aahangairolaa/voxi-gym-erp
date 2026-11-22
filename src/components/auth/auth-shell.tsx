"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { api } from "@/lib/api-client";

/** Split screen used by sign-in, sign-up and password pages: brand image left, form right. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#0b0718] lg:block">
        <img src="/brand/voxi-orb.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0718] via-[#0b0718]/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="font-display text-4xl leading-tight font-semibold">
            Your gym.
            <br />
            <span className="bg-gradient-to-r from-[#c9b8ff] to-[#e5a3ff] bg-clip-text text-transparent">Your business.</span>
          </p>
          <p className="mt-3 max-w-md text-white/65">Members, memberships, biometric access and payments in QAR. One premium system built for gyms in Qatar.</p>
        </div>
      </div>
      <div className="relative flex items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--glow),transparent_70%)]" />
        <div className="relative w-full max-w-sm animate-fade-up">
          <Link href="/" className="mb-10 inline-flex">
            <Logo size="md" />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          {children}
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
          <p className="mt-10 text-center text-xs text-muted">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link> · <Link href="/terms" className="hover:text-ink">Terms</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export type AuthConfig = { google: boolean; signup: boolean; passwordReset: boolean; database: boolean };

/** Which sign-in options this deployment has turned on. */
export function useAuthConfig() {
  const [cfg, setCfg] = useState<AuthConfig | null>(null);
  useEffect(() => {
    api.get<AuthConfig>("/api/auth/config").then(setCfg).catch(() => setCfg({ google: false, signup: true, passwordReset: false, database: false }));
  }, []);
  return cfg;
}

export function GoogleButton({ intent, label }: { intent: "login" | "register"; label: string }) {
  return (
    <a
      href={`/api/auth/google?intent=${intent}`}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface text-sm font-semibold text-ink shadow-sm transition hover:border-brand-200 hover:bg-surface-2"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
      </svg>
      {label}
    </a>
  );
}

export function Divider({ text = "or" }: { text?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-line" />
      {text}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export const AUTH_ERRORS: Record<string, string> = {
  google_off: "Google sign-in isn't set up yet. Use your email and password.",
  google_cancelled: "Google sign-in was cancelled.",
  google_state: "That sign-in link expired. Please try again.",
  google_failed: "Google sign-in didn't work. Please try again or use your password.",
  account_paused: "This account is deactivated or the gym is suspended. Contact your gym owner or VOXI.",
};
