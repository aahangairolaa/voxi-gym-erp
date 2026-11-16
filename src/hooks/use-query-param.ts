"use client";
import { useEffect, useState } from "react";

/**
 * Read a value from the URL (?status=EXPIRING) once the page loads.
 * (Avoids Next.js' useSearchParams, which needs a <Suspense> wrapper.)
 */
export function useQueryParam(name: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(name));
  }, [name]);
  return value;
}
