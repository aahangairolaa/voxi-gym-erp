"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuArrowRight, LuMegaphone, LuX } from "react-icons/lu";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

type Notice = { id: string; message: string; tone: "INFO" | "WARNING" | "SUCCESS"; link: string | null };
const KEY = "voxi-notice-dismissed";

const TONE = {
  INFO: "bg-brand-600 text-white",
  WARNING: "bg-amber-400 text-amber-950",
  SUCCESS: "bg-emerald-600 text-white",
};

/** A message from the VOXI team, across the top of the app. Each person can hide it once read. */
export function NoticeBanner() {
  const { data } = useApi<{ notice: Notice | null }>("/api/notice", { refreshMs: 5 * 60_000 });
  const [hidden, setHidden] = useState<string | null>(null);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY));
    } catch {
      /* storage blocked: always show */
    }
  }, []);

  const n = data?.notice;
  if (!n || hidden === n.id) return null;

  const dismiss = () => {
    setHidden(n.id);
    try {
      localStorage.setItem(KEY, n.id);
    } catch {
      /* ignore */
    }
  };
  const external = n.link?.startsWith("http");

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8", TONE[n.tone])} role="status">
      <LuMegaphone className="h-4 w-4 shrink-0 opacity-80" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">VOXI: </span>
        {n.message}
        {n.link && (
          <Link href={n.link} target={external ? "_blank" : undefined} className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2">
            Learn more <LuArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </p>
      <button type="button" onClick={dismiss} aria-label="Hide this message" className="rounded-md p-1 opacity-80 hover:bg-black/10 hover:opacity-100">
        <LuX className="h-4 w-4" />
      </button>
    </div>
  );
}
