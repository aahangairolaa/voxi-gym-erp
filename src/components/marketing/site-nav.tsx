"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CONTACT } from "@/lib/contact";
import { LuArrowRight } from "react-icons/lu";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function SiteNav({ dark = false }: { dark?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const onDark = dark && !scrolled;
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "glass border-b border-line/70" : "bg-transparent")}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/">
          <Logo className={onDark ? "!text-white" : ""} />
        </Link>
        <nav className={cn("hidden items-center gap-6 text-sm font-medium md:flex", onDark ? "text-white/70" : "text-ink-soft")}>
          <Link href="/#features" className="transition hover:text-brand-500">Features</Link>
          <Link href="/#biometric" className="transition hover:text-brand-500">Biometric</Link>
          <Link href="/pricing" className="transition hover:text-brand-500">Pricing</Link>
          <Link href="/#faq" className="transition hover:text-brand-500">FAQ</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className={cn("rounded-xl px-3 py-2 text-sm font-semibold transition", onDark ? "text-white hover:bg-white/10" : "text-ink hover:bg-surface-2")}>
            Sign in
          </Link>
          <Link href="/register" className="hidden items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white brand-gradient shadow-[0_6px_20px_-6px_rgba(106,68,242,0.7)] transition hover:brightness-110 sm:inline-flex">
            Start free trial <LuArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted">The premium gym ERP, made for Qatar.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
          <Link href="/register" className="hover:text-ink">Free trial</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <a href={`mailto:${CONTACT.email}`} className="hover:text-ink">{CONTACT.email}</a>
          <span>Doha, Qatar</span>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-muted">© {new Date().getFullYear()} VOXI. All rights reserved.</p>
    </footer>
  );
}
