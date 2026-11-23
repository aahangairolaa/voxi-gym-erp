"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuX } from "react-icons/lu";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui";
import { can, homeFor, ROLE_LABEL } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { useUser } from "./session-context";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useUser();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6">
        <Link href={homeFor(user.role, user.gym?.rolePermissions)} onClick={onNavigate}>
          <Logo />
        </Link>
        <span className="ml-2.5 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          {user.role === "SUPER_ADMIN" ? "ADMIN" : "ERP"}
        </span>
      </div>

      {user.gym && (
        <div className="mx-3 mb-1 flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-2.5">
          {user.gym.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.gym.logo} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
          ) : (
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
              style={{ background: user.gym.brandColor ?? "#6a44f2" }}
            >
              {user.gym.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{user.gym.name}</p>
            <p className="truncate text-[11px] text-muted">
              {user.gym.status === "TRIAL" ? "Free trial" : user.gym.status === "SUSPENDED" ? "Suspended" : `VOXI · ${user.gym.billingMonths} month${user.gym.billingMonths === 1 ? "" : "s"}`}
            </p>
          </div>
          {user.gym.status !== "ACTIVE" && can(user.role, "billing", user.gym?.rolePermissions) && (
            <Link
              href="/billing"
              onClick={onNavigate}
              className="ml-auto shrink-0 rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-700"
            >
              {user.gym.planRequest ? "Pending" : "Choose plan"}
            </Link>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pt-3 pb-6 scrollbar-thin">
        {NAV.map((section) => {
          const items = section.items.filter((i) => can(user.role, i.module, user.gym?.rolePermissions));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[10.5px] font-bold tracking-[0.14em] text-muted/80 uppercase">{section.title}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || (!item.exact && pathname.startsWith(item.href + "/"));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-all duration-200",
                          active
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-200"
                            : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        {active && (
                          <span className="absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-brand-700 shadow-[0_0_12px_rgba(124,92,255,0.7)]" />
                        )}
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                            active ? "text-brand-600 dark:text-brand-300" : "text-muted",
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Avatar name={user.name} src={user.photoUrl} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line bg-surface lg:block">
        <SidebarContent />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-[#0d0a1f]/45 backdrop-blur-[2px]" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-[284px] max-w-[85vw] animate-slide-in-left border-r border-line bg-surface shadow-2xl">
            <button onClick={onClose} className="absolute top-4 right-3 rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Close menu">
              <LuX className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
