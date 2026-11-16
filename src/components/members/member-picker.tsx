"use client";
import { useEffect, useRef, useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import { Avatar, Spinner, StatusBadge } from "@/components/ui";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api-client";
import type { SearchResult } from "@/types/api";

/** Type a name / code / phone and pick a member. */
export function MemberPicker({
  value,
  onChange,
  placeholder = "Search member by name, code or phone…",
  autoFocus,
}: {
  value: SearchResult | null;
  onChange: (m: SearchResult | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const dq = useDebounce(q, 200);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dq.trim()) return setResults([]);
    setLoading(true);
    api
      .get<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(dq)}`)
      .then((r) => setResults(r.results))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [dq]);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-2 dark:border-brand-800 dark:bg-brand-500/10">
        <Avatar name={value.name} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{value.name}</p>
          <p className="truncate text-xs text-muted">
            {value.code} · {value.phone}
          </p>
        </div>
        <StatusBadge status={value.status} />
        <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Clear">
          <LuX className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={box}>
      <LuSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        className="input pl-10"
        value={q}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {loading && <Spinner className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-brand-500" />}
      {open && q && (
        <ul className="absolute z-20 mt-1.5 max-h-72 w-full animate-scale-in overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          {results.length === 0 && !loading && <li className="px-3 py-4 text-center text-sm text-muted">No members found</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2"
                onClick={() => {
                  onChange(r);
                  setQ("");
                  setOpen(false);
                }}
              >
                <Avatar name={r.name} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                  <p className="truncate text-xs text-muted">
                    {r.code} · {r.phone}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
