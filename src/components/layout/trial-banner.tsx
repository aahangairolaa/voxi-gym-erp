"use client";
import { LuSparkles } from "react-icons/lu";
import { CONTACT } from "@/lib/contact";
import { useUser } from "./session-context";

/** Thin banner for owners & managers while their gym is on the free trial. */
export function TrialBanner() {
  const user = useUser();
  const gym = user.gym;
  if (!gym || gym.status !== "TRIAL" || !gym.trialEndsAt || (user.role !== "OWNER" && user.role !== "MANAGER")) return null;
  const days = Math.ceil((new Date(gym.trialEndsAt).getTime() - Date.now()) / 86_400_000);
  const ended = days <= 0;
  const text = ended ? "Your free trial has ended." : `${days} day${days === 1 ? "" : "s"} left in your free trial.`;
  const wa = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(`Hi VOXI, I'd like to activate ${gym.name}'s subscription.`)}`;
  return (
    <div className={`relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[13px] font-medium text-white ${ended ? "bg-rose-600" : "brand-gradient"}`}>
      <LuSparkles className="h-4 w-4" />
      <span>{text}</span>
      <a href={CONTACT.whatsapp ? wa : `mailto:${CONTACT.email}?subject=${encodeURIComponent("Activate VOXI")}`} target="_blank" rel="noreferrer" className="rounded-full bg-white/20 px-3 py-0.5 font-semibold hover:bg-white/30">
        {ended ? "Activate now" : "Choose a plan"}
      </a>
    </div>
  );
}
