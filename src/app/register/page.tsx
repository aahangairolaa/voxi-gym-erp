"use client";
import { PhoneInput } from "@/components/ui/phone-input";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuCircleCheck } from "react-icons/lu";
import { AuthShell, Divider, SocialButtons, useAuthConfig } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

/** Self-service sign-up: a new gym on a 7-day free trial. */
export default function RegisterPage() {
  const router = useRouter();
  const cfg = useAuthConfig();
  const [google, setGoogle] = useState<{ email: string; name: string } | null>(null);
  const [fromLogin, setFromLogin] = useState(false);
  const [form, setForm] = useState({ gymName: "", ownerName: "", email: "", phone: "", password: "", website: "" });
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setFromLogin(q.get("from") === "login");
    if (q.get("google") === "1") {
      api.get<{ email: string | null; name: string | null }>("/api/auth/google/pending").then((p) => {
        if (p.email) {
          setGoogle({ email: p.email, name: p.name ?? "" });
          setForm((f) => ({ ...f, email: p.email!, ownerName: p.name ?? f.ownerName }));
        }
      });
    }
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await api.post<{ home: string }>("/api/auth/register", {
        ...form,
        phone: form.phone || null,
        password: google ? null : form.password,
        acceptTerms: accept,
      });
      router.replace(r.home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
      setLoading(false);
    }
  };

  if (cfg && !cfg.signup) {
    return (
      <AuthShell title="Sign-ups are by invitation" subtitle="Contact VOXI and we'll set up your gym for you.">
        <Link href="/login" className="mt-8 inline-flex text-sm font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={google ? "Almost there" : "Start your free trial"}
      subtitle={google ? `Finish setting up VOXI for ${google.email}.` : "7 days free · no card needed · cancel anytime"}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      {cfg?.database === false && (
        <p className="mt-6 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          VOXI is getting ready. Free trials open very soon. Want a demo now? <Link href="/#contact" className="font-semibold underline">Contact us</Link>.
        </p>
      )}
      {fromLogin && google && (
        <p className="mt-6 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
          There’s no VOXI account for {google.email} yet. If you work at a gym that uses VOXI, ask the owner to add you. Otherwise, create your gym below.
        </p>
      )}
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="label">Gym name</span>
          <input className="input h-12" required value={form.gymName} onChange={set("gymName")} placeholder="e.g. Pearl Strength Club" autoFocus />
        </label>
        <label className="block">
          <span className="label">Your name</span>
          <input className="input h-12" required autoComplete="name" value={form.ownerName} onChange={set("ownerName")} />
        </label>
        <label className="block">
          <span className="label">Work email</span>
          <input className="input h-12" type="email" required autoComplete="email" value={form.email} onChange={set("email")} readOnly={!!google} placeholder="you@yourgym.qa" />
        </label>
        <label className="block">
          <span className="label">Mobile (optional)</span>
          <PhoneInput className="[&_input]:h-12 [&_select]:h-12" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </label>
        {!google && (
          <label className="block">
            <span className="label">Password</span>
            <input className="input h-12" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" />
          </label>
        )}
        {/* Honeypot for bots — hidden from people */}
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden />
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]" required />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-medium text-brand-600 hover:underline">terms</Link> and{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-brand-600 hover:underline">privacy policy</Link>.
          </span>
        </label>
        {error && <p className="animate-scale-in rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!accept}>
          Create my gym <LuArrowRight className="h-4 w-4" />
        </Button>
        {(cfg?.google || cfg?.microsoft) && !google && (
          <div>
            <Divider text="or" />
            <SocialButtons cfg={cfg} intent="register" />
          </div>
        )}
        <ul className="space-y-1.5 pt-2 text-xs text-muted">
          {["Starter plans in QAR and an exercise library ready to go", "Add your team, import members, connect WhatsApp", "Your data stays yours. Export it anytime"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <LuCircleCheck className="h-3.5 w-3.5 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>
      </form>
    </AuthShell>
  );
}
