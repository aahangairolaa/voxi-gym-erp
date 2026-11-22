import Link from "next/link";
import {
  LuArrowRight, LuBanknote, LuCalendarDays, LuChartColumn, LuDumbbell, LuFingerprint, LuIdCard, LuScanFace, LuShieldCheck,
  LuSmartphone, LuTrophy, LuUserPlus, LuUsers, LuBuilding2, LuLanguages, LuZap,
} from "react-icons/lu";
import { PricingTable } from "@/components/marketing/pricing-table";
import { ShowcaseFilm } from "@/components/marketing/showcase-film";
import { TRIAL_DAYS } from "@/lib/pricing";
import { SiteFooter, SiteNav } from "@/components/marketing/site-nav";
import { CONTACT } from "@/lib/contact";

const FEATURES = [
  { icon: LuUsers, title: "Members", text: "Profiles with QID, emergency contacts, history and status at a glance." },
  { icon: LuIdCard, title: "Memberships", text: "Sell, renew, freeze and cancel. Renewals chain automatically." },
  { icon: LuBanknote, title: "Payments in QAR", text: "Cash, card, Fawran and bank transfer, with printable receipts." },
  { icon: LuScanFace, title: "Attendance", text: "One-tap front-desk check-in with live ‘who’s inside’ view." },
  { icon: LuFingerprint, title: "Biometric access", text: "Face & fingerprint terminals check members in and block expired plans." },
  { icon: LuDumbbell, title: "Workouts", text: "Programme builder, exercise library and workout logs for trainers." },
  { icon: LuCalendarDays, title: "Classes", text: "Weekly timetable, capacity and bookings for every studio." },
  { icon: LuTrophy, title: "Leaderboard", text: "Points for visits and workouts keep your community motivated." },
  { icon: LuUserPlus, title: "Leads", text: "Instagram and WhatsApp enquiries in a pipeline until they join." },
  { icon: LuChartColumn, title: "Reports", text: "Revenue vs expenses, busy-hours heatmap, Excel exports." },
  { icon: LuShieldCheck, title: "Roles & staff", text: "Owner, manager, reception and trainer. Each sees only what they need." },
  { icon: LuBuilding2, title: "Multi-branch", text: "The Pearl, Lusail, West Bay. One system for every location." },
];

const FAQ = [
  ["Which biometric devices work with VOXI?", "Any device that can call a web address (webhook), plus ZKTeco terminals via their ADMS cloud mode out of the box. We also supply and install hardware."],
  ["Is my data safe?", "Each gym's data lives in its own encrypted cloud database. Staff only see what their role allows, and device keys are stored hashed."],
  ["Can I import my current members?", "Yes. Send us your Excel sheet or export from your old software and we migrate members, plans and balances for you."],
  ["Does it work on phones and tablets?", "Yes. Reception can check members in from an iPad and owners can follow revenue from their phone."],
  ["Do you support Arabic?", "The interface is in English today. A full Arabic (right-to-left) version is on our roadmap."],
];

export default function LandingPage() {
  return (
    <div className="bg-bg">
      <SiteNav dark />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#07040f] pt-28 pb-20 text-white sm:pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(124,92,255,0.35),transparent_70%)]" />
        <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full border border-brand-500/20" />
        <div className="pointer-events-none absolute -right-52 -bottom-52 h-[640px] w-[640px] rounded-full border border-brand-500/15" />
        <div className="relative mx-auto max-w-6xl px-5 text-center">
          <img
            src="/brand/voxi-wordmark.webp"
            alt="VOXI"
            className="mx-auto mt-4 w-full max-w-[620px] animate-fade-up [animation-delay:80ms] [mask-image:radial-gradient(closest-side,#000_62%,transparent_100%)]"
          />
          <h1 className="mx-auto mt-2 max-w-3xl animate-fade-up font-display text-4xl leading-[1.08] font-semibold tracking-tight [animation-delay:160ms] sm:text-6xl">
            Run Your Gym, <span className="bg-gradient-to-r from-[#c9b8ff] via-[#a78bff] to-[#e5a3ff] bg-clip-text text-transparent">Not the Chaos</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-base text-white/65 [animation-delay:240ms] sm:text-lg">
            VOXI is the all-in-one ERP for premium gyms in Qatar. Members, memberships, biometric access, payments in QAR, classes, trainers and reports, beautifully simple.
          </p>
          <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:320ms]">
            <Link href="/pricing" className="inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white brand-gradient shadow-[0_10px_40px_-10px_rgba(124,92,255,0.9)] transition hover:brightness-110">
              See pricing <LuArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/register" className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
              Start {TRIAL_DAYS}-day free trial
            </Link>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto mt-16 max-w-5xl animate-fade-up [animation-delay:420ms]">
            <div className="absolute -inset-x-10 -bottom-10 top-10 rounded-[40px] bg-brand-500/30 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#f7f6fb] p-3 text-left text-[#15122b] shadow-2xl sm:rounded-3xl sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Revenue this month", "QAR 186,400", true],
                  ["Active members", "612", false],
                  ["Check-ins today", "214", false],
                  ["Expiring in 7 days", "18", false],
                ].map(([l, v, accent]) => (
                  <div key={String(l)} className={`rounded-2xl p-4 ${accent ? "text-white brand-gradient" : "border border-[#e8e5f2] bg-white"}`}>
                    <p className={`text-[10px] font-semibold uppercase ${accent ? "text-white/75" : "text-[#6e6a88]"}`}>{l}</p>
                    <p className="mt-2 font-display text-xl font-semibold sm:text-2xl">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#e8e5f2] bg-white p-4 sm:col-span-2">
                  <p className="text-sm font-semibold">Revenue</p>
                  <div className="mt-4 flex h-32 items-end gap-2 sm:gap-3">
                    {[42, 55, 48, 66, 72, 61, 78, 84, 70, 88, 92, 100].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-[#6a44f2] to-[#a58bff]" style={{ height: `${h}%`, opacity: 0.55 + i * 0.04 }} />
                    ))}
                  </div>
                </div>
                <div className="hidden rounded-2xl border border-[#e8e5f2] bg-white p-4 sm:block">
                  <p className="text-sm font-semibold">Live scans</p>
                  {["James Carter", "Olivia Bennett", "Daniel Brooks", "Maria Santos"].map((n, i) => (
                    <div key={n} className="mt-3 flex items-center gap-2.5">
                      <span className="h-7 w-7 rounded-full" style={{ background: `linear-gradient(135deg, hsl(${255 + i * 12} 85% 68%), hsl(${270 + i * 12} 70% 48%))` }} />
                      <span className="flex-1 truncate text-xs font-semibold">{n}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${i === 2 ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}>{i === 2 ? "Out" : "In"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Qatar-ready strip */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 text-sm sm:grid-cols-4">
          {[
            [LuBanknote, "Qatari Riyal pricing & receipts"],
            [LuSmartphone, "Fawran, card & cash payments"],
            [LuIdCard, "QID on every member profile"],
            [LuLanguages, "Arabic version on the roadmap"],
          ].map(([Icon, t]) => {
            const I = Icon as typeof LuBanknote;
            return (
              <div key={t as string} className="flex items-center gap-3 text-ink-soft">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <I className="h-4 w-4" />
                </span>
                {t as string}
              </div>
            );
          })}
        </div>
      </section>

      {/* Film */}
      <section id="film" className="relative scroll-mt-20 overflow-hidden bg-[#07040f] px-5 py-24 text-white sm:py-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-brand-300 uppercase">See it in motion</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Built for the way premium gyms run</h2>
            <p className="mt-4 text-white/60">From the first scan at the door to the last invoice of the day.</p>
          </div>
          <ShowcaseFilm />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-brand-600 uppercase">Everything in one place</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Run your entire gym from one calm dashboard</h2>
          <p className="mt-4 text-muted">No more spreadsheets, paper registers or five different apps. VOXI connects the front desk, the gym floor and the finance office.</p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl text-white brand-gradient shadow-[0_8px_20px_-8px_rgba(106,68,242,0.8)]">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Biometric */}
      <section id="biometric" className="scroll-mt-20 px-5 pb-24">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[32px] bg-[#0d0820] p-8 text-white sm:p-14 lg:grid-cols-2">
          <img src="/brand/voxi-orb.webp" alt="" className="pointer-events-none absolute top-1/2 right-0 w-[70%] -translate-y-1/2 opacity-40 [mask-image:linear-gradient(to_right,transparent,#000_35%)] lg:w-[58%] lg:opacity-100" />
          <div className="relative">
            <p className="text-xs font-bold tracking-[0.25em] text-brand-300 uppercase">Biometric access</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Members walk in. VOXI does the rest.</h2>
            <p className="mt-4 text-white/65">
              Connect face or fingerprint terminals at each entrance. Every scan checks the membership in real time. Active members get in, expired ones are stopped and reception is alerted.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              {["Works with ZKTeco out of the box", "Open webhook API for any other brand", "Live scan feed & denied-entry alerts", "Automatic check-in & check-out times"].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <LuZap className="h-4 w-4 text-brand-300" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative hidden lg:block" />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-brand-600 uppercase">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">One plan, every feature</h2>
          <p className="mt-4 text-muted">Pick your term and your branches. Start with a {TRIAL_DAYS}-day free trial, no card needed.</p>
        </div>
        <PricingTable />
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-10 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-brand-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="px-5 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] p-10 text-center text-white brand-gradient sm:p-16">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[70%] -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />
          <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">Ready to run a smarter gym?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/80">See VOXI with your own data in a 20-minute demo, at your gym or online.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={CONTACT.whatsapp ? `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent("Hi VOXI, I'd like a demo for my gym.")}` : `mailto:${CONTACT.email}?subject=VOXI%20demo`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center rounded-xl bg-white px-6 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
            >
              Book a demo
            </a>
            <Link href="/register" className="inline-flex h-12 items-center rounded-xl border border-white/30 px-6 text-sm font-semibold transition hover:bg-white/10">
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
