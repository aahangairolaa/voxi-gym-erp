"use client";
import { useEffect, useState } from "react";

/** Wait until the user stops typing before using a value (e.g. search boxes). */
export function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
