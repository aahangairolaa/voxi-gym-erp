"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuEye, LuEyeOff, LuLock, LuMail, LuMailCheck } from "react-icons/lu";
import { AUTH_ERRORS, AuthShell, CodeStep, Divider, SocialButtons, useAuthConfig } from "@/components/auth/auth-shell";
import { VoxiOrb } from "@/components/brand/logo";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";
import { emailError } from "@/lib/validate";

const SHOW_DEMO = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [resetNote, setResetNote] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  /**
   * Forgot password: the reset link goes to the email typed above, and only ever to the
   * address saved on that account. There's no separate box where a different address could be entered.
   */
  const forgot = async () => {
    setError(null);
    setResetNote(null);
    const typed = email.trim();
    const bad = emailError(typed, true);
    if (bad) {
      setError(typed ? bad : "Type your account email above first, then tap Forgot password.");
      emailRef.current?.focus();
      return;
    }
    setResetting(true);
    try {
      const r = await api.post<{ emailEnabled: boolean }>("/api/auth/forgot", { email: typed });
      setResetNote(
        r.emailEnabled
          ? `If ${typed} has a VOXI account, we've emailed a reset link to it. The link works for 1 hour; check spam too.`
          : "Password emails aren't switched on yet. Ask your gym owner or manager to set a new password for you in Staff.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the reset link");
    } finally {
      setResetting(false);
    }
  };
  const cfg = useAuthConfig();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) setError(AUTH_ERRORS[code] ?? "Sign-in failed. Please try again.");
  }, []);

  const submit = async (e: React.FormEvent | null, code?: string) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await api.post<{ home: string; needsCode?: boolean; email?: string }>("/api/auth/login", { email, password, ...(code ? { code } : {}) });
      if (r.needsCode) {
        // First time signing in with a password: confirm the email with a code
        setCodeFor(r.email ?? email);
        setLoading(false);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      // Only follow ?next= for normal gym roles (VOXI admins have their own home page)
      router.replace(next && next.startsWith("/") && !next.startsWith("//") && r.home === "/dashboard" ? next : r.home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  };

  if (codeFor) {
    return (
      <AuthShell title="Confirm it's you" subtitle="First time signing in? We just need to check your email.">
        <CodeStep
          email={codeFor}
          loading={loading}
          error={error}
          submitLabel="Sign in"
          onVerify={(c) => submit(null, c)}
          onResend={async () => {
            setError(null);
            await api.post("/api/auth/login", { email, password }).catch((e: Error) => setError(e.message));
          }}
          onBack={() => {
            setCodeFor(null);
            setError(null);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your gym’s VOXI workspace."
      footer={
        cfg?.signup !== false && (
          <>
            New to VOXI?{" "}
            <Link href="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Start a 7-day free trial
            </Link>
          </>
        )
      }
    >
          {cfg?.database === false && (
            <p className="mt-6 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              VOXI is getting ready. Sign-in opens very soon. Want a demo? <Link href="/#contact" className="font-semibold underline">Contact us</Link>.
            </p>
          )}
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <div className="relative">
                <LuMail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  ref={emailRef}
                  className="input h-12 pl-10"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setResetNote(null);
                  }}
                  placeholder="you@yourgym.qa"
                />
              </div>
            </label>
            <label className="block">
              <span className="label flex items-center justify-between">
                Password
                <button type="button" onClick={forgot} disabled={resetting} className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-300">
                  {resetting ? "Sending…" : "Forgot password?"}
                </button>
              </span>
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
            {resetNote && (
              <p className="flex animate-scale-in items-start gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
                <LuMailCheck className="mt-0.5 h-4 w-4 shrink-0" /> {resetNote}
              </p>
            )}
            {error && <p className="animate-scale-in rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Sign in <LuArrowRight className="h-4 w-4" />
            </Button>
          </form>
          {(cfg?.google || cfg?.microsoft) && (
            <div>
              <Divider text="or" />
              <SocialButtons cfg={cfg} intent="login" />
            </div>
          )}

          {/* Demo logins: shown on your computer, hidden on the live site unless NEXT_PUBLIC_SHOW_DEMO_LOGINS=true */}
          {SHOW_DEMO && (
          <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-4 text-xs text-muted">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink-soft">
              <VoxiOrb size={14} /> Demo accounts (password <code className="font-mono">voxi1234</code>)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {["owner", "manager", "reception", "trainer", "pulse", "admin"].map((r) => (
                <button key={r} type="button" onClick={() => { setEmail(`${r}@voxi.qa`); setPassword("voxi1234"); }} className="rounded-lg bg-surface-2 px-2 py-1.5 text-left font-mono hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15">
                  {r}@voxi.qa
                </button>
              ))}
            </div>
          </div>
          )}
    </AuthShell>
  );
}
