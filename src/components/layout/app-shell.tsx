"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { VoxiOrb } from "@/components/brand/logo";
import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { api } from "@/lib/api-client";
import { can, homeFor, moduleForPath } from "@/lib/permissions";
import { BottomNav } from "./bottom-nav";
import { TrialBanner } from "./trial-banner";
import { SessionContext, type CurrentGym, type CurrentUser, type SessionValue } from "./session-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Frame around every logged-in page: sidebar, top bar, mobile tab bar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionValue | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    api
      .get<{ user: CurrentUser; gym: CurrentGym }>("/api/auth/me")
      .then((r) => setUser({ ...r.user, gym: r.gym }))
      .catch(() => (window.location.href = "/login"));
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  // Send people away from pages their role can't use (e.g. a trainer opening /payments)
  const mod = moduleForPath(pathname);
  // (/settings is open to everyone for "change my password"; only owners can edit the gym there)
  const blocked =
    !!user && (mod ? !can(user.role, mod) : pathname !== "/settings" && user.role === "SUPER_ADMIN");
  useEffect(() => {
    if (user && blocked) router.replace(homeFor(user.role));
  }, [user, blocked, router]);

  // Each gym's own brand colour tints the accent glow
  const glow = user?.gym?.brandColor ? ({ "--glow": `${user.gym.brandColor}33` } as React.CSSProperties) : undefined;

  if (!user || blocked) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <VoxiOrb size={56} className="animate-float drop-shadow-[0_10px_30px_rgba(124,92,255,0.6)]" />
          <p className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">Loading VOXI</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={user}>
      <ToastProvider>
        <ConfirmProvider>
          {/* soft violet glow at the top of every page */}
          <div style={glow} className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(60%_60%_at_70%_0%,var(--glow),transparent_70%)]" />
          <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <div className="relative lg:pl-[264px]">
            <TrialBanner />
            <Topbar onMenu={() => setMenuOpen(true)} />
            <main key={pathname} className="mx-auto w-full max-w-[1480px] animate-fade-up px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">
              {children}
            </main>
          </div>
          <BottomNav onMenu={() => setMenuOpen(true)} />
        </ConfirmProvider>
      </ToastProvider>
    </SessionContext.Provider>
  );
}
