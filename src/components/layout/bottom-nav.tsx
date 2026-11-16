"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuLayoutDashboard, LuUsers, LuScanFace, LuReceipt, LuMenu } from "react-icons/lu";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useUser } from "./session-context";

/** Phone-only bottom tab bar with a big centre "Check-in" button. */
export function BottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const user = useUser();
  const tab = (href: string, label: string, Icon: typeof LuUsers) => {
    const active = pathname.startsWith(href);
    return (
      <Link href={href} className={cn("flex flex-1 flex-col items-center gap-1 py-2 text-[10.5px] font-semibold", active ? "text-brand-600 dark:text-brand-300" : "text-muted")}>
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  };
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-end px-2">
        {tab("/dashboard", "Home", LuLayoutDashboard)}
        {tab("/members", "Members", LuUsers)}
        <Link href="/attendance" className="-mt-5 flex flex-1 flex-col items-center gap-1 pb-2 text-[10.5px] font-semibold text-ink">
          <span className="grid h-12 w-12 place-items-center rounded-2xl text-white brand-gradient shadow-[0_8px_24px_-6px_rgba(106,68,242,0.7)]">
            <LuScanFace className="h-6 w-6" />
          </span>
          Check-in
        </Link>
        {can(user.role, "payments") ? tab("/payments", "Payments", LuReceipt) : tab("/leaderboard", "Ranks", LuReceipt)}
        <button onClick={onMenu} className="flex flex-1 flex-col items-center gap-1 py-2 text-[10.5px] font-semibold text-muted">
          <LuMenu className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  );
}
