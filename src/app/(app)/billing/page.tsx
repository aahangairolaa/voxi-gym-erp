"use client";
import { useState } from "react";
import { LuCalendarCheck, LuClock, LuMapPin, LuMessageCircle } from "react-icons/lu";
import { PricingTable, type PlanChoice } from "@/components/marketing/pricing-table";
import { useUser } from "@/components/layout/session-context";
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton, useConfirm, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { CONTACT } from "@/lib/contact";
import { formatDate } from "@/lib/format";
import { MAX_LOCATIONS, quote, qar, termFor, type Quote } from "@/lib/pricing";

type Billing = {
  name: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED";
  trialEndsAt: string | null;
  billingMonths: number;
  extraBranches: number;
  paidUntil: string | null;
  planRequest: { months: number; extraBranches: number; total: number; entrances?: number; onboarding?: boolean; oneTime?: number; requestedAt: string; requestedBy: string } | null;
  branchesUsed: number;
  current: Quote | null;
};

const branchText = (n: number) => (n ? ` + ${n} branch${n === 1 ? "" : "es"}` : "");

export default function BillingPage() {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, reload } = useApi<Billing>("/api/billing");
  const [busy, setBusy] = useState(false);

  const choose = async ({ quote: q, entrances, onboarding, oneTime }: PlanChoice) => {
    const ok = await confirm({
      title: "Request this plan?",
      message: `VOXI for ${q.termLabel}${branchText(q.extraBranches)}: ${qar(q.total)}${oneTime ? `, plus ${qar(oneTime)} one-time setup` : ""}. The VOXI team will confirm and send your invoice. You can pay by bank transfer, card or Fawran.`,
      confirmLabel: "Send request",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post("/api/billing", { months: q.months, extraBranches: q.extraBranches, entrances, onboarding });
      toast("success", "Request sent. We will be in touch within one business day.");
      // Reload so the sidebar and banner show the pending request
      window.location.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Could not send the request");
      setBusy(false);
    }
  };

  const withdraw = async () => {
    const ok = await confirm({ title: "Withdraw your plan request?", message: "You can send a new one at any time.", confirmLabel: "Withdraw", danger: true });
    if (!ok) return;
    try {
      await api.del("/api/billing");
      window.location.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;

  const days = data?.trialEndsAt ? Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / 86_400_000) : null;
  const req = data?.planRequest;
  const reqQuote = req ? quote(req.months, req.extraBranches) : null;
  const wa = req && CONTACT.whatsapp
    ? `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(`Hi VOXI, ${data?.name} has requested VOXI for ${termFor(req.months).label}${branchText(req.extraBranches)} (${qar(req.total)}).`)}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" subtitle="Your VOXI subscription, branches and plan" />

      {data?.status === "TRIAL" && days !== null && days <= 0 && !req && (
        <div className="relative overflow-hidden rounded-3xl bg-[#120c30] p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_90%_0%,rgba(124,92,255,0.45),transparent_70%)]" />
          <p className="relative text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">Free trial ended</p>
          <p className="relative mt-2 text-2xl font-semibold tracking-tight">Choose a plan to unlock VOXI</p>
          <p className="relative mt-1 max-w-2xl text-sm text-white/70">
            Your members, plans and settings are all saved. VOXI is paused for your team until a plan is chosen and confirmed.
          </p>
        </div>
      )}

      {!data ? (
        <Skeleton className="h-36" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
              <LuCalendarCheck className="h-4 w-4" /> Status
            </div>
            <div className="mt-3 flex items-center gap-2">
              <p className="font-display text-2xl font-semibold">
                {data.status === "TRIAL" ? "Free trial" : data.status === "ACTIVE" ? "Active" : "Suspended"}
              </p>
              {data.status === "TRIAL" && days !== null && <Badge tone={days > 2 ? "brand" : "red"}>{days > 0 ? `${days} day${days === 1 ? "" : "s"} left` : "Ended"}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted">
              {data.status === "TRIAL"
                ? `Trial ends ${formatDate(data.trialEndsAt)}`
                : data.status === "ACTIVE"
                  ? `Paid until ${formatDate(data.paidUntil)}`
                  : "Contact VOXI to reactivate your account"}
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
              <LuClock className="h-4 w-4" /> Plan
            </div>
            <p className="mt-3 font-display text-2xl font-semibold">
              {data.current ? `${data.current.termLabel}` : "Not chosen yet"}
            </p>
            <p className="mt-1 text-sm text-muted">{data.current ? `${qar(data.current.total)} per term` : "Pick a term and branches below"}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
              <LuMapPin className="h-4 w-4" /> Locations
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tabular-nums">
              {data.branchesUsed} <span className="text-base font-medium text-muted">of {data.status === "TRIAL" ? `${MAX_LOCATIONS} during trial` : 1 + data.extraBranches}</span>
            </p>
            <p className="mt-1 text-sm text-muted">Main location plus {data.extraBranches} paid branch{data.extraBranches === 1 ? "" : "es"}</p>
          </Card>
        </div>
      )}

      {req && reqQuote && (
        <Card className="flex flex-wrap items-center gap-4 border-brand-300 p-5 dark:border-brand-500/40">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">
              Requested: VOXI for {reqQuote.termLabel}
              {branchText(reqQuote.extraBranches)}, {qar(reqQuote.total)}
              {req.oneTime ? `, plus ${qar(req.oneTime)} one-time setup` : ""}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              Sent by {req.requestedBy} on {formatDate(req.requestedAt)}. We will confirm and send your invoice within one business day.
            </p>
          </div>
          <div className="flex gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer">
                <Button variant="secondary">
                  <LuMessageCircle className="h-4 w-4" /> WhatsApp us
                </Button>
              </a>
            )}
            <Button variant="ghost" onClick={withdraw}>Withdraw</Button>
          </div>
        </Card>
      )}

      {data && (
        <div className="pt-4">
          <PricingTable
            mode="billing"
            initialMonths={req?.months ?? data.billingMonths}
            initialBranches={req?.extraBranches ?? data.extraBranches}
            busy={busy}
            chooseLabel={req ? "Update request" : data.status === "ACTIVE" ? "Request this change" : "Choose this plan"}
            onChoose={choose}
          />
          {user.role !== "OWNER" && <p className="mt-3 text-xs text-muted">Your gym owner will be included on the invoice.</p>}
        </div>
      )}
    </div>
  );
}
