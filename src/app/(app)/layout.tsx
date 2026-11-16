import { AppShell } from "@/components/layout/app-shell";

/** Every page inside the (app) folder gets the sidebar + top bar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
