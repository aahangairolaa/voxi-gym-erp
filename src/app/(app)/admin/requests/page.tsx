"use client";
import { LuBell, LuCheck, LuX } from "react-icons/lu";
import { GymMark, planText, STATUS_LABEL, useAdminData } from "@/components/admin/gym-admin";
import { useGymActions } from "@/components/admin/platform-tools";
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, useConfirm } from "@/components/ui";
import { formatDate, timeAgo } from "@/lib/format";
import { qar } from "@/lib/pricing";

/** Plans gyms asked for on their Billing page. Activate once the invoice is paid. */
export default function AdminRequestsPage() {
  const { gyms, setEditing, manage, reload } = useAdminData();
  const { busy, activate, decline } = useGymActions(reload);
  const confirm = useConfirm();
  if (gyms.error) return <ErrorState message={gyms.error} onRetry={gyms.reload} />;
  const rows = (gyms.data?.gyms ?? []).filter((g) => g.planRequest).sort((a, b) => +new Date(a.planRequest!.requestedAt) - +new Date(b.planRequest!.requestedAt));

  return (
    <>
      <PageHeader title="Plan requests" subtitle="Plans gyms chose on their Billing page. Send the invoice, then activate once it's paid." />
      {gyms.loading && <Skeleton className="h-40" />}
      {gyms.data && rows.length === 0 && (
        <Card>
          <EmptyState icon={LuBell} title="No requests waiting" message="When a gym picks a plan on its Billing page, it shows up here." />
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((g) => {
          const r = g.planRequest!;
          return (
            <Card key={g.id} className="p-5">
              <div className="flex items-start gap-3">
                <GymMark g={g} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{g.name}</p>
                  <p className="text-xs text-muted">
                    {STATUS_LABEL[g.status]} · asked by {r.requestedBy} {timeAgo(r.requestedAt)}
                  </p>
                </div>
                <button onClick={() => setEditing(g)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  Open
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-surface-2 p-4 text-sm">
                <dt className="text-muted">Plan</dt>
                <dd className="text-right font-semibold text-ink">
                  {planText(r.months, r.extraBranches)}
                  {r.cafe ? " + Café" : ""}
                </dd>
                <dt className="text-muted">Subscription</dt>
                <dd className="text-right tabular-nums">{qar(r.total)}</dd>
                {!!r.oneTime && (
                  <>
                    <dt className="text-muted">One-time</dt>
                    <dd className="text-right tabular-nums">
                      {qar(r.oneTime)}
                      <span className="block text-xs text-muted">
                        {[r.entrances ? `${r.entrances} biometric entrance${r.entrances === 1 ? "" : "s"}` : "", r.onboarding ? "onboarding" : ""].filter(Boolean).join(" + ")}
                      </span>
                    </dd>
                  </>
                )}
                {r.promoCode && (
                  <>
                    <dt className="text-muted">Promo {r.promoCode}</dt>
                    <dd className="text-right text-emerald-600 tabular-nums">−{qar(r.promoDiscount ?? 0)}</dd>
                  </>
                )}
                <dt className="border-t border-line pt-2 font-semibold text-ink">Invoice now</dt>
                <dd className="border-t border-line pt-2 text-right text-base font-bold text-ink tabular-nums">{qar(r.totalToday ?? r.total)}</dd>
              </dl>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {g.owner?.email && (
                    <a className="hover:underline" href={`mailto:${g.owner.email}?subject=${encodeURIComponent(`Your VOXI invoice: ${g.name}`)}`}>
                      {g.owner.email}
                    </a>
                  )}{" "}
                  · {formatDate(r.requestedAt)}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600"
                    disabled={busy === g.id}
                    onClick={async () => {
                      if (await confirm({ title: `Decline ${g.name}'s request?`, message: "The request is cleared. The gym stays as it is and can request again.", confirmLabel: "Decline" })) decline(g);
                    }}
                  >
                    <LuX className="h-3.5 w-3.5" /> Decline
                  </Button>
                  <Button
                    size="sm"
                    loading={busy === g.id}
                    onClick={async () => {
                      if (await confirm({ title: `Activate ${g.name}?`, message: `Only once the invoice of ${qar(r.totalToday ?? r.total)} is paid. The gym becomes active for ${planText(r.months, r.extraBranches)}.`, confirmLabel: "Activate" })) activate(g);
                    }}
                  >
                    <LuCheck className="h-3.5 w-3.5" /> Activate
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {manage}
    </>
  );
}
