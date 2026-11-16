"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { LuCircleCheck, LuCircleAlert, LuInfo } from "react-icons/lu";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

/** Show a small notification:  const toast = useToast(); toast("success", "Saved!") */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const icon = { success: LuCircleCheck, error: LuCircleAlert, info: LuInfo };
  const color = { success: "text-emerald-500", error: "text-rose-500", info: "text-brand-500" };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
        {toasts.map((t) => {
          const Icon = icon[t.kind];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex max-w-sm animate-scale-in items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-[0_18px_40px_-14px_rgba(40,20,120,0.35)]"
            >
              <Icon className={cn("h-5 w-5 shrink-0", color[t.kind])} />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
