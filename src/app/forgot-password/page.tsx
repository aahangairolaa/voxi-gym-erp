"use client";
import { useState } from "react";
import Link from "next/link";
import { LuMailCheck } from "react-icons/lu";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "no-email">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await api.post<{ emailEnabled: boolean }>("/api/auth/forgot", { email });
      setState(r.emailEnabled ? "sent" : "no-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Back to sign in
        </Link>
      }
    >
      {state === "sent" ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface-2/60 p-5 text-sm text-ink-soft">
          <LuMailCheck className="mb-2 h-6 w-6 text-brand-600" />
          If <b className="text-ink">{email}</b> has a VOXI account, a reset link is on its way. It works for 1 hour. Check your spam folder too.
        </div>
      ) : state === "no-email" ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface-2/60 p-5 text-sm text-ink-soft">
          Password emails aren’t switched on for this VOXI yet. Ask your gym owner or manager to set a new password for you in <b className="text-ink">Staff</b>. Owners can contact VOXI support.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="label">Email</span>
            <input className="input h-12" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </label>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
