"use client";
import Link from "next/link";
import { LuSparkles } from "react-icons/lu";
import { useUser } from "./session-context";

/** Thin banner for owners & managers while their gym is on the free trial. */
export function TrialBanner() {
  const user = useUser();
  const gym = user.gym;
  if (!gym || gym.status !== "TRIAL" || !gym.trialEndsAt || (user.role !== "OWNER" && user.role !== "MANAGER")) return null;
  const days = Math.ceil((new Date(gym.trialEndsAt).getTime() - Date.now()) / 86_400_000);
  const ended = days <= 0;
  const text = gym.planRequest
    ? "Plan requested. We will confirm your subscription shortly."
    : ended
      ? "Your free trial has ended."
      : `${days} day${days === 1 ? "" : "s"} left in your free trial.`;
  return (
    <div className={`relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[13px] font-medium text-white ${ended && !gym.planRequest ? "bg-rose-600" : "brand-gradient"}`}>
      <LuSparkles className="h-4 w-4" />
      <span>{text}</span>
      <Link href="/billing" className="rounded-full bg-white/20 px-3 py-0.5 font-semibold hover:bg-white/30">
        {gym.planRequest ? "View request" : ended ? "Activate now" : "Choose a plan"}
      </Link>
    </div>
  );
}
