"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuLogOut, LuMenu, LuSettings, LuChevronDown } from "react-icons/lu";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui";
import { api } from "@/lib/api-client";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { CommandSearch } from "./command-search";
import { useUser } from "./session-context";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const user = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const logout = async () => {
    await api.post("/api/auth/logout").catch(() => {});
    router.replace("/login");
  };

  return (
    <header className="glass sticky top-0 z-20 border-b border-line/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={onMenu} className="-ml-1 rounded-xl p-2 text-ink-soft hover:bg-surface-2 lg:hidden" aria-label="Open menu">
          <LuMenu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="lg:hidden">
          <Logo size="sm" />
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <CommandSearch />
          <span className="hidden rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-soft sm:inline">
            {ROLE_LABEL[user.role]}
          </span>
          <ThemeToggle />
          <div className="relative" ref={menuRef}>
            <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition hover:bg-surface-2">
              <Avatar name={user.name} size={34} />
              <LuChevronDown className="hidden h-4 w-4 text-muted sm:block" />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-60 animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <div className="my-1 h-px bg-line" />
                {can(user.role, "settings") && (
                  <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-surface-2">
                    <LuSettings className="h-4 w-4" /> Settings
                  </Link>
                )}
                <Link href="/settings#password" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-surface-2">
                  <LuSettings className="h-4 w-4" /> Change password
                </Link>
                <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                  <LuLogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
