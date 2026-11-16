"use client";
/**
 * Load data from the API inside a component:
 *   const { data, loading, error, reload } = useApi<DashboardData>("/api/dashboard");
 * Results are cached in memory, so going back to a page shows data instantly
 * while fresh data loads in the background.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

const cache = new Map<string, unknown>();

export function useApi<T>(url: string | null, opts: { refreshMs?: number } = {}) {
  const [data, setData] = useState<T | undefined>(() => (url ? (cache.get(url) as T | undefined) : undefined));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url && !cache.has(url));
  const latest = useRef(url);

  const load = useCallback(
    async (silent = false) => {
      if (!url) return;
      latest.current = url;
      if (!silent && !cache.has(url)) setLoading(true);
      try {
        const result = await api.get<T>(url);
        if (latest.current !== url) return; // a newer request replaced this one
        cache.set(url, result);
        setData(result);
        setError(null);
      } catch (e) {
        if (latest.current === url) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (latest.current === url) setLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    if (!url) return;
    setData(cache.get(url) as T | undefined);
    load();
  }, [url, load]);

  useEffect(() => {
    if (!opts.refreshMs || !url) return;
    const t = setInterval(() => load(true), opts.refreshMs);
    return () => clearInterval(t);
  }, [opts.refreshMs, url, load]);

  return { data, error, loading: loading && !data, reload: () => load(true), setData };
}

/** Clear cached responses whose URL starts with a prefix (after saving data). */
export function invalidate(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}
