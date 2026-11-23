"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LuChevronDown, LuMail, LuSearch, LuX } from "react-icons/lu";
import { FAQS, GUIDES } from "@/lib/help-content";
import { CONTACT } from "@/lib/contact";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.toLowerCase();

/** Guides + FAQ with one search box. Searching shows only what matches. */
export function HelpCenter() {
  const [q, setQ] = useState("");
  const query = norm(q.trim());

  const guides = useMemo(() => {
    if (!query) return GUIDES;
    return GUIDES.map((g) => {
      const hit = norm(g.title + " " + g.summary).includes(query);
      const steps = hit ? g.steps : g.steps.filter((s) => norm(s.title + " " + s.body).includes(query));
      return { ...g, steps };
    }).filter((g) => g.steps.length > 0);
  }, [query]);

  const faqs = useMemo(() => {
    if (!query) return FAQS;
    return FAQS.map((f) => ({ ...f, items: f.items.filter(([a, b]) => norm(a + " " + b).includes(query)) })).filter((f) => f.items.length > 0);
  }, [query]);

  const nothing = query && guides.length === 0 && faqs.length === 0;

  return (
    <div>
      {/* Search */}
      <div className="relative mx-auto max-w-2xl">
        <LuSearch className="pointer-events-none absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the help, e.g. kiosk, staff login, promo code"
          aria-label="Search the help"
          className="h-14 w-full rounded-2xl border border-line bg-surface pr-12 pl-13 text-base text-ink shadow-sm outline-none transition placeholder:text-muted/70 focus:border-brand-400 focus:ring-4 focus:ring-[var(--ring)]"
          style={{ paddingLeft: "3.25rem" }}
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute top-1/2 right-4 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-ink">
            <LuX className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Topic chips */}
      {!query && (
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2">
          {GUIDES.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand-300 hover:text-ink">
              {g.title}
            </a>
          ))}
          <a href="#faq" className="rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300">
            FAQ
          </a>
        </div>
      )}

      {nothing && (
        <div className="mx-auto mt-14 max-w-md text-center">
          <p className="font-semibold text-ink">Nothing matches "{q}"</p>
          <p className="mt-1 text-sm text-muted">Try another word, or email us and we'll help.</p>
        </div>
      )}

      {/* Guides */}
      {guides.length > 0 && (
        <div className="mt-14 space-y-6">
          {!query && <h2 className="text-2xl font-semibold tracking-tight">Step-by-step guides</h2>}
          {guides.map((g) => (
            <section key={g.id} id={g.id} className="card scroll-mt-24 p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-semibold tracking-tight text-ink">{g.title}</h3>
                <p className="text-sm text-muted">{g.summary}</p>
              </div>
              <ol className="mt-6 space-y-5">
                {g.steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full brand-gradient text-sm font-semibold text-white tabular-nums">{i + 1}</span>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-semibold text-ink">{s.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {!query && g.tips && (
                <div className="mt-6 rounded-xl bg-brand-50/70 p-4 text-sm text-ink-soft dark:bg-brand-500/10">
                  {g.tips.map((t) => (
                    <p key={t}>
                      <span className="font-semibold text-brand-700 dark:text-brand-300">Tip: </span>
                      {t}
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <div id="faq" className="mt-16 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {faqs.map((f) => (
              <div key={f.id}>
                <p className="mb-3 text-xs font-bold tracking-[0.2em] text-brand-600 uppercase">{f.title}</p>
                <div className="space-y-2">
                  {f.items.map(([question, answer]) => (
                    <Faq key={question} q={question} a={answer} open={!!query} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl bg-[#120b2b] px-6 py-10 text-center text-white sm:px-10">
        <h2 className="text-2xl font-semibold tracking-tight">Still stuck?</h2>
        <p className="max-w-lg text-sm text-white/70">Our team in Doha replies within one business day.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href={`mailto:${CONTACT.email}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#1a1033] transition hover:bg-white/90">
            <LuMail className="h-4 w-4" /> {CONTACT.email}
          </a>
          <Link href="/register" className="inline-flex h-11 items-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
            Start your free trial
          </Link>
        </div>
      </div>
    </div>
  );
}

function Faq({ q, a, open: forceOpen }: { q: string; a: string; open: boolean }) {
  const [open, setOpen] = useState(false);
  const shown = open || forceOpen;
  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={shown} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="font-medium text-ink">{q}</span>
        <LuChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", shown && "rotate-180")} />
      </button>
      {shown && <p className="px-5 pb-4 text-sm leading-relaxed text-ink-soft">{a}</p>}
    </div>
  );
}
