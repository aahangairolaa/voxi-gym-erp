import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/marketing/site-nav";
import { HelpCenter } from "@/components/marketing/help-center";

export const metadata: Metadata = {
  title: "Help Centre",
  description: "Learn VOXI from scratch: step-by-step guides for setup, staff, members, check-in, payments, classes, the café add-on and billing, plus answers to common questions.",
};

export default function HelpPage() {
  return (
    <div className="bg-bg">
      <SiteNav />
      <section className="relative overflow-hidden px-5 pt-32 pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(50%_60%_at_50%_0%,var(--glow),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-brand-600 uppercase">Help Centre</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Learn VOXI <span className="text-gradient">from scratch</span>
            </h1>
            <p className="mt-4 text-muted">Step-by-step guides for every part of VOXI, and answers to the questions gyms ask most.</p>
          </div>
          <HelpCenter />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
