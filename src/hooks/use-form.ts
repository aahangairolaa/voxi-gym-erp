"use client";
import { useState } from "react";

/**
 * Minimal form state helper.
 *   const form = useForm({ name: "", price: 0 });
 *   <input {...form.bind("name")} />
 *   form.values.name
 */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value }));
  const bind = <K extends keyof T>(key: K) => ({
    value: (values[key] ?? "") as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      set(key, (typeof initial[key] === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value) as T[K]),
  });
  return { values, set, bind, reset: (v: T = initial) => setValues(v), setValues };
}
