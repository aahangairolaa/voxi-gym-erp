"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuDelete, LuExpand, LuLogOut, LuQrCode } from "react-icons/lu";
import { QrScanner, canScanQr } from "@/components/attendance/qr-scanner";
import { VoxiOrb } from "@/components/brand/logo";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Result = {
  action: "IN" | "OUT" | "DENIED";
  allowed: boolean;
  reason: string | null;
  member: { firstName: string; photoUrl: string | null; status: string; plan: string | null; endDate: string | null };
};

const PIN_KEY = "voxi-kiosk-pin";
const RESULT_SECONDS = 5;

/**
 * Self check-in screen for the front desk (tablet, iPad or a big screen).
 * Staff open it once; members then check themselves in and out by scanning their
 * VOXI card or typing their member number or phone. A 4-digit PIN closes it.
 */
export default function KioskPage() {
  const [gym, setGym] = useState<{ name: string; logo: string | null; brandColor: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<{ gym: { name: string; logo: string | null; brandColor: string } }>("/api/kiosk")
      .then((r) => setGym(r.gym))
      .catch((e: Error) => setError(e.message));
    try {
      setPin(sessionStorage.getItem(PIN_KEY));
    } catch {
      /* private mode: ask for a PIN every time */
    }
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Keep the hidden input focused so USB / Bluetooth QR scanners can "type" into it
  useEffect(() => {
    if (!result && !scanning && !exiting && pin) inputRef.current?.focus();
  }, [result, scanning, exiting, pin]);

  // Back to the welcome screen after a few seconds
  useEffect(() => {
    if (!result && !notFound) return;
    const t = setTimeout(() => {
      setResult(null);
      setNotFound(null);
      setCode("");
    }, RESULT_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [result, notFound]);

  const submit = useCallback(
    async (value: string) => {
      const v = value.trim();
      if (!v || busy) return;
      setBusy(true);
      setNotFound(null);
      try {
        setResult(await api.post<Result>("/api/kiosk", { code: v }));
      } catch (e) {
        setNotFound(e instanceof Error ? e.message : "Something went wrong. Please ask reception.");
      } finally {
        setBusy(false);
        setCode("");
      }
    },
    [busy],
  );

  const press = (k: string) => {
    setNotFound(null);
    if (k === "del") setCode((c) => c.slice(0, -1));
    else if (k === "clear") setCode("");
    else setCode((c) => (c.length < 16 ? c + k : c));
  };

  const fullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {});

  if (error) {
    return (
      <Shell>
        <div className="m-auto max-w-md text-center">
          <VoxiOrb size={56} className="mx-auto" />
          <p className="mt-6 text-xl font-semibold">The check-in screen can&apos;t open</p>
          <p className="mt-2 text-white/60">{error}</p>
          <a href="/attendance" className="mt-6 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-[#2d1a6e]">
            Back to VOXI
          </a>
        </div>
      </Shell>
    );
  }

  // Staff set a PIN before handing the screen to members
  if (!pin) {
    return (
      <Shell>
        <PinPad
          title="Set a 4-digit PIN"
          hint="You'll need it to close the check-in screen. Members won't see it."
          onDone={(p) => {
            try {
              sessionStorage.setItem(PIN_KEY, p);
            } catch {
              /* ignore */
            }
            setPin(p);
            fullscreen();
          }}
        />
      </Shell>
    );
  }

  if (exiting) {
    return (
      <Shell>
        <PinPad
          title="Enter the PIN to close"
          hint="Ask a member of staff."
          onCancel={() => setExiting(false)}
          onDone={(p) => {
            if (p !== pin) return false;
            try {
              sessionStorage.removeItem(PIN_KEY);
            } catch {
              /* ignore */
            }
            document.exitFullscreen?.().catch(() => {});
            window.location.href = "/attendance";
            return true;
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell brand={gym?.brandColor}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 pt-7">
        <div className="flex items-center gap-3">
          {gym?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gym.logo} alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
          ) : (
            <VoxiOrb size={36} />
          )}
          <p className="text-lg font-semibold">{gym?.name ?? ""}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-semibold tabular-nums">
            {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Qatar" })}
          </p>
          <p className="text-xs tracking-[0.2em] text-white/50 uppercase">
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Qatar" })}
          </p>
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-6 py-6">
        {result ? (
          <ResultCard r={result} />
        ) : (
          <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="text-center lg:text-left">
              <VoxiOrb size={72} className="mx-auto drop-shadow-[0_14px_40px_rgba(124,92,255,0.7)] lg:mx-0" />
              <h1 className="mt-8 text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
                Welcome.
                <br />
                <span className="bg-gradient-to-r from-[#c9b8ff] via-[#a78bff] to-[#e5a3ff] bg-clip-text text-transparent">Check in or out.</span>
              </h1>
              <p className="mt-5 text-lg text-white/60">Scan your VOXI member card, or type your member number or phone.</p>
              {canScanQr() && (
                <button
                  type="button"
                  onClick={() => setScanning(true)}
                  className="mt-8 inline-flex h-16 items-center gap-3 rounded-2xl bg-white px-8 text-lg font-semibold text-[#2d1a6e] shadow-[0_20px_60px_-20px_rgba(255,255,255,0.5)] transition hover:bg-brand-50"
                >
                  <LuQrCode className="h-6 w-6" /> Scan my card
                </button>
              )}
              {notFound && <p className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-5 py-4 text-left text-base text-rose-100">{notFound}</p>}
            </div>

            {/* Keypad */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(code);
              }}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
            >
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="none"
                autoComplete="off"
                aria-label="Member number or phone"
                placeholder="Member number or phone"
                className="h-16 w-full rounded-2xl border border-white/15 bg-black/30 px-5 text-center font-display text-3xl font-semibold tracking-widest text-white outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-white/35 focus:border-brand-300"
              />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "del"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    className={cn(
                      "grid h-16 place-items-center rounded-2xl text-2xl font-semibold transition active:scale-95",
                      k === "clear" || k === "del" ? "bg-white/5 text-base text-white/60 hover:bg-white/10" : "bg-white/10 hover:bg-white/20",
                    )}
                    aria-label={k === "del" ? "Delete" : k === "clear" ? "Clear" : k}
                  >
                    {k === "del" ? <LuDelete className="h-6 w-6" /> : k === "clear" ? "Clear" : k}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!code || busy}
                className="mt-4 h-16 w-full rounded-2xl text-lg font-semibold text-white brand-gradient shadow-[0_14px_40px_-12px_rgba(124,92,255,0.9)] transition disabled:opacity-40"
              >
                {busy ? "Checking..." : "Continue"}
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between px-8 pb-6 text-xs text-white/35">
        <span>Powered by VOXI</span>
        <span className="flex gap-2">
          <button type="button" onClick={fullscreen} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10 hover:text-white/70">
            <LuExpand className="h-3.5 w-3.5" /> Full screen
          </button>
          <button type="button" onClick={() => setExiting(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10 hover:text-white/70">
            <LuLogOut className="h-3.5 w-3.5" /> Close
          </button>
        </span>
      </footer>

      {scanning && (
        <QrScanner
          facing="user"
          onClose={() => setScanning(false)}
          onScan={(text) => {
            setScanning(false);
            submit(text);
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children, brand }: { children: React.ReactNode; brand?: string }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#07040f] text-white select-none">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(60% 50% at 30% 20%, ${brand ?? "#7c5cff"}40, transparent 70%), radial-gradient(50% 50% at 90% 100%, rgba(124,92,255,0.25), transparent 70%)` }}
      />
      <div className="relative flex min-h-dvh flex-col">{children}</div>
    </div>
  );
}

function ResultCard({ r }: { r: Result }) {
  const ok = r.allowed;
  const out = r.action === "OUT";
  const title = !ok ? `Sorry, ${r.member.firstName}` : out ? `See you soon, ${r.member.firstName}` : `Welcome, ${r.member.firstName}`;
  const line = !ok
    ? `${r.reason ?? "We couldn't check you in"}. Please see reception.`
    : out
      ? "You're checked out. Have a great day."
      : r.reason === "Already checked in"
        ? "You're already checked in. Enjoy your workout."
        : "You're checked in. Enjoy your workout.";
  return (
    <div className="flex animate-fade-up flex-col items-center text-center">
      <div className={cn("relative rounded-full p-1.5", ok ? "bg-gradient-to-br from-emerald-300 to-emerald-600" : "bg-gradient-to-br from-rose-300 to-rose-600")}>
        {r.member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.member.photoUrl} alt="" className="h-44 w-44 rounded-full border-4 border-[#07040f] object-cover" />
        ) : (
          <span className="grid h-44 w-44 place-items-center rounded-full border-4 border-[#07040f] bg-white/10 font-display text-6xl font-semibold">
            {r.member.firstName.slice(0, 1)}
          </span>
        )}
      </div>
      <p className={cn("mt-8 text-sm font-semibold tracking-[0.3em] uppercase", ok ? "text-emerald-300" : "text-rose-300")}>
        {!ok ? "Not checked in" : out ? "Checked out" : "Checked in"}
      </p>
      <h2 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">{title}</h2>
      <p className="mt-4 max-w-xl text-xl text-white/65">{line}</p>
      {ok && r.member.plan && r.member.endDate && !out && (
        <p className="mt-6 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm text-white/70">
          {r.member.plan} · valid until {formatDate(r.member.endDate)}
          {r.member.status === "EXPIRING" && <span className="ml-2 text-amber-300">Renew soon</span>}
        </p>
      )}
    </div>
  );
}

function PinPad({ title, hint, onDone, onCancel }: { title: string; hint: string; onDone: (pin: string) => boolean | void; onCancel?: () => void }) {
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  useEffect(() => {
    if (pin.length === 4) {
      if (onDone(pin) === false) {
        setWrong(true);
        setPin("");
      }
    }
  }, [pin, onDone]);
  return (
    <div className="m-auto w-full max-w-sm px-6 text-center">
      <VoxiOrb size={48} className="mx-auto" />
      <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
      <p className={cn("mt-2 text-sm", wrong ? "text-rose-300" : "text-white/55")}>{wrong ? "That PIN isn't right. Try again." : hint}</p>
      <div className="mt-6 flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-4 w-4 rounded-full border border-white/40", i < pin.length && "border-white bg-white")} />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => {
                setWrong(false);
                setPin((p) => (k === "del" ? p.slice(0, -1) : p.length < 4 ? p + k : p));
              }}
              className="grid h-16 place-items-center rounded-2xl bg-white/10 text-2xl font-semibold transition hover:bg-white/20 active:scale-95"
              aria-label={k === "del" ? "Delete" : k}
            >
              {k === "del" ? <LuDelete className="h-6 w-6" /> : k}
            </button>
          ),
        )}
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-6 text-sm text-white/55 hover:text-white">
          Cancel
        </button>
      )}
    </div>
  );
}
