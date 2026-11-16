"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuEye, LuEyeOff, LuLock, LuMail } from "react-icons/lu";
import { Logo, VoxiOrb } from "@/components/brand/logo";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { email, password });
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#0b0718] lg:block">
        <img src="/brand/voxi-orb.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0718] via-[#0b0718]/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="font-display text-4xl leading-tight font-semibold">
            Your gym.
            <br />
            <span className="bg-gradient-to-r from-[#c9b8ff] to-[#e5a3ff] bg-clip-text text-transparent">Your business.</span>
          </p>
          <p className="mt-3 max-w-md text-white/65">Members, memberships, biometric access and payments in QAR — one premium system built for gyms in Qatar.</p>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--glow),transparent_70%)]" />
        <div className="relative w-full max-w-sm animate-fade-up">
          <Link href="/" className="mb-10 inline-flex">
            <Logo size="md" />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to your gym’s VOXI workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <div className="relative">
                <LuMail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
                <input className="input h-12 pl-10" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourgym.qa" />
              </div>
            </label>
            <label className="block">
              <span className="label">Password</span>
              <div className="relative">
                <LuLock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="input h-12 pr-11 pl-10"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted hover:text-ink" aria-label="Show password">
                  {show ? <LuEyeOff className="h-4 w-4" /> : <LuEye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            {error && <p className="animate-scale-in rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Sign in <LuArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-4 text-xs text-muted">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink-soft">
              <VoxiOrb size={14} /> Demo accounts (password <code className="font-mono">voxi1234</code>)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {["owner", "manager", "reception", "trainer"].map((r) => (
                <button key={r} type="button" onClick={() => { setEmail(`${r}@voxi.qa`); setPassword("voxi1234"); }} className="rounded-lg bg-surface-2 px-2 py-1.5 text-left font-mono hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15">
                  {r}@voxi.qa
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
