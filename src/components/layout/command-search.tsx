"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { LuSearch, LuArrowRight } from "react-icons/lu";
import { Avatar, Spinner, StatusBadge } from "@/components/ui";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/api";

/** Ctrl/⌘ + K → find any member by name, code (M-1001), phone or QID. */
export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const dq = useDebounce(q, 200);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    if (!dq.trim()) return setResults([]);
    setLoading(true);
    api
      .get<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(dq)}`)
      .then((r) => {
        setResults(r.results);
        setActive(0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [dq]);

  const go = (r: SearchResult) => {
    setOpen(false);
    router.push(`/members/${r.id}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 text-sm text-muted transition hover:border-brand-200 hover:text-ink md:w-72"
      >
        <LuSearch className="h-4 w-4" />
        <span className="hidden md:inline">Search members…</span>
        <kbd className="ml-auto hidden rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold md:inline">Ctrl K</kbd>
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]">
            <div className="absolute inset-0 animate-fade-in bg-[#0d0a1f]/40 backdrop-blur-[3px]" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
              <div className="flex items-center gap-3 border-b border-line px-4">
                <LuSearch className="h-5 w-5 text-brand-500" />
                <input
                  ref={input}
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
                    if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
                    if (e.key === "Enter" && results[active]) go(results[active]);
                  }}
                  placeholder="Name, M-1001, phone or QID…"
                  className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                />
                {loading && <Spinner className="h-4 w-4 text-brand-500" />}
              </div>
              <ul className="max-h-[50vh] overflow-y-auto p-2">
                {!q && <li className="px-3 py-8 text-center text-sm text-muted">Start typing to find a member</li>}
                {q && !loading && results.length === 0 && dq === q && (
                  <li className="px-3 py-8 text-center text-sm text-muted">No members match “{q}”</li>
                )}
                {results.map((r, i) => (
                  <li key={r.id}>
                    <button
                      onClick={() => go(r)}
                      onMouseEnter={() => setActive(i)}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === active && "bg-surface-2")}
                    >
                      <Avatar name={r.name} src={r.photoUrl} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                        <p className="truncate text-xs text-muted">
                          {r.code} · {r.phone}
                          {r.plan ? ` · ${r.plan}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                      {i === active && <LuArrowRight className="h-4 w-4 text-muted" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
