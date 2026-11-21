"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setToken(new URLSearchParams(window.location.search).get("token") ?? ""), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/reset", { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="You'll be signed out on all other devices.">
      {done ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">Password changed. You can sign in now.</p>
          <Link href="/login">
            <Button size="lg" className="w-full">Sign in</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="label">New password</span>
            <input className="input h-12" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </label>
          <label className="block">
            <span className="label">Type it again</span>
            <input className="input h-12" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {!token && <p className="text-sm text-rose-600">This link is missing its code. Open the link from your email again.</p>}
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!token}>
            Save new password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
