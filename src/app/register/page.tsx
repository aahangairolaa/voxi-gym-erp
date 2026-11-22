"use client";
import { PhoneInput } from "@/components/ui/phone-input";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuCircleCheck } from "react-icons/lu";
import { AuthShell, CodeStep, Divider, SocialButtons, useAuthConfig } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui";
import { api, fieldErrors } from "@/lib/api-client";
import { collectErrors, emailError, nameError, passwordError, phoneError } from "@/lib/validate";
import { cn } from "@/lib/utils";

/** "Aisha Al Khater" -> ["Aisha", "Al Khater"] */
function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  return [parts[0] ?? "", parts.slice(1).join(" ")];
}

/** Message under a field, shown once it has a problem. */
function Problem({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <span role="alert" className="mt-1 block text-xs font-medium text-rose-600 dark:text-rose-400">
      {text}
    </span>
  );
}

/** Self-service sign-up: a new gym on a 7-day free trial. */
export default function RegisterPage() {
  const router = useRouter();
  const cfg = useAuthConfig();
  const [google, setGoogle] = useState<{ email: string; name: string } | null>(null);
  const [fromLogin, setFromLogin] = useState(false);
  const [form, setForm] = useState({ gymName: "", firstName: "", lastName: "", email: "", phone: "+974 ", password: "", website: "" });
  const [accept, setAccept] = useState(false);
  const [promo, setPromo] = useState(false);
  const [tried, setTried] = useState(false); // after the first submit, problems show as you type
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeFor, setCodeFor] = useState<string | null>(null); // email we sent a code to

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setFromLogin(q.get("from") === "login");
    if (q.get("google") === "1") {
      api.get<{ email: string | null; name: string | null }>("/api/auth/google/pending").then((p) => {
        if (p.email) {
          setGoogle({ email: p.email, name: p.name ?? "" });
          const [first, last] = splitName(p.name ?? "");
          setForm((f) => ({ ...f, email: p.email!, firstName: first || f.firstName, lastName: last || f.lastName }));
        }
      });
    }
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
    if (serverFields[k]) setServerFields(({ [k]: _, ...rest }) => rest);
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const problems = collectErrors({
    gymName: form.gymName.trim().length < 2 ? "Enter your gym's name" : null,
    firstName: nameError(form.firstName, "First name"),
    lastName: nameError(form.lastName, "Last name"),
    email: emailError(form.email),
    phone: phoneError(form.phone),
    password: google ? null : passwordError(form.password),
    terms: accept ? null : "Please accept the terms and privacy policy to continue",
  });
  /** What to show under a field: after a submit attempt, or once the person has left the field. */
  const err = (k: keyof typeof problems | string) => serverFields[k] ?? (tried || touched[k] ? problems[k] : undefined);

  const send = (code?: string) =>
    api.post<{ home?: string; needsCode?: boolean; email?: string }>("/api/auth/register", {
      gymName: form.gymName,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      website: form.website,
      password: google ? null : form.password,
      acceptTerms: accept,
      marketingOptIn: promo,
      ...(code ? { code } : {}),
    });

  const submit = async (e: React.FormEvent | null, code?: string) => {
    e?.preventDefault();
    if (!code) {
      setTried(true);
      if (Object.keys(problems).length) {
        setError(null);
        // Take the person to the first field that needs fixing
        const first = Object.keys(problems)[0];
        document.querySelector<HTMLElement>(`[data-field="${first}"] input`)?.focus();
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const r = await send(code);
      if (r.needsCode) {
        setCodeFor(r.email ?? form.email);
        setLoading(false);
        return;
      }
      router.replace(r.home ?? "/dashboard");
    } catch (e) {
      const f = fieldErrors(e);
      if (Object.keys(f).length && !code) {
        setServerFields(f);
        setError(null);
      } else setError(e instanceof Error ? e.message : "Sign-up failed");
      setLoading(false);
    }
  };

  if (codeFor) {
    return (
      <AuthShell title="Check your email" subtitle="One last step to confirm it's really you.">
        <CodeStep
          email={codeFor}
          loading={loading}
          error={error}
          submitLabel="Create my gym"
          onVerify={(c) => submit(null, c)}
          onResend={async () => {
            setError(null);
            await send().catch((e: Error) => setError(e.message));
          }}
          onBack={() => {
            setCodeFor(null);
            setError(null);
          }}
        />
      </AuthShell>
    );
  }

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
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <label className="block" data-field="gymName" data-invalid={err("gymName") ? "" : undefined}>
          <span className="label">Gym name</span>
          <input className="input h-12" value={form.gymName} onChange={set("gymName")} onBlur={blur("gymName")} placeholder="e.g. Pearl Strength Club" autoFocus maxLength={100} />
          <Problem text={err("gymName")} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block" data-field="firstName" data-invalid={err("firstName") ? "" : undefined}>
            <span className="label">First name</span>
            <input className="input h-12" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} onBlur={blur("firstName")} maxLength={60} />
            <Problem text={err("firstName")} />
          </label>
          <label className="block" data-field="lastName" data-invalid={err("lastName") ? "" : undefined}>
            <span className="label">Last name</span>
            <input className="input h-12" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} onBlur={blur("lastName")} maxLength={60} />
            <Problem text={err("lastName")} />
          </label>
        </div>
        <label className="block" data-field="email" data-invalid={err("email") ? "" : undefined}>
          <span className="label">Work email</span>
          <input className="input h-12" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set("email")} onBlur={blur("email")} readOnly={!!google} placeholder="you@yourgym.qa" maxLength={254} />
          <Problem text={err("email")} />
        </label>
        <div className="block" data-field="phone" data-invalid={err("phone") ? "" : undefined}>
          <span className="label">Mobile number</span>
          <PhoneInput
            className="[&_input]:h-12 [&_select]:h-12"
            value={form.phone}
            invalid={!!err("phone")}
            onBlur={blur("phone")}
            onChange={(v) => {
              setForm({ ...form, phone: v });
              if (serverFields.phone) setServerFields(({ phone: _, ...rest }) => rest);
            }}
          />
          <Problem text={err("phone")} />
        </div>
        {!google && (
          <label className="block" data-field="password" data-invalid={err("password") ? "" : undefined}>
            <span className="label">Password</span>
            <input className="input h-12" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} onBlur={blur("password")} placeholder="At least 8 characters, with a number" />
            <Problem text={err("password")} />
          </label>
        )}
        {/* Honeypot for bots — hidden from people */}
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden />
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-600)]" />
          <span>Send me offers, tips and product news from VOXI by email and WhatsApp. You can unsubscribe anytime.</span>
        </label>
        <label className={cn("flex items-start gap-2.5 text-sm text-ink-soft", tried && !accept && "text-rose-600 dark:text-rose-400")}>
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-600)]" />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-medium text-brand-600 hover:underline">terms</Link> and{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-brand-600 hover:underline">privacy policy</Link>.
          </span>
        </label>
        {tried && !accept && <Problem text={problems.terms} />}
        {error && <p className="animate-scale-in rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
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
