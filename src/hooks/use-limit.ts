"use client";
import { useEffect, useState } from "react";

/**
 * Show long lists in pages of `step` rows with a "Show more" button.
 *   const { visible, hasMore, more, remaining } = useLimit(rows, 50);
 */
export function useLimit<T>(items: T[] | undefined, step = 50) {
  const [limit, setLimit] = useState(step);
  const total = items?.length ?? 0;
  useEffect(() => setLimit(step), [total, step]); // reset when the list changes (new filter)
  return {
    visible: (items ?? []).slice(0, limit),
    hasMore: total > limit,
    remaining: Math.max(0, total - limit),
    more: () => setLimit((l) => l + step),
  };
}
