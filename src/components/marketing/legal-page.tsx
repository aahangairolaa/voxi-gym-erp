import { SiteFooter, SiteNav } from "./site-nav";

/** Simple, readable layout for the privacy policy and terms. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 pt-32 pb-24">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-10 space-y-6 text-[15px] leading-7 text-ink-soft [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_a]:text-brand-600 [&_a]:underline">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
