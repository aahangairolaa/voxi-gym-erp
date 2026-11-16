"use client";
import { useApi } from "./use-api";
import type { Branch, Plan } from "@/types/api";

/** Lists used in many dropdowns (cached). */
export function usePlans(activeOnly = true) {
  const { data } = useApi<{ plans: Plan[] }>(activeOnly ? "/api/plans?active=1" : "/api/plans");
  return data?.plans ?? [];
}
export function useBranches() {
  const { data } = useApi<{ branches: Branch[] }>("/api/branches");
  return data?.branches ?? [];
}
export function useTrainers() {
  const { data } = useApi<{ trainers: { id: string; name: string; specialty: string | null }[] }>("/api/staff/trainers");
  return data?.trainers ?? [];
}
