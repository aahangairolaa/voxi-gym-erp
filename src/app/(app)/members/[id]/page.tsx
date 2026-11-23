"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  LuArrowLeft, LuDoorOpen, LuDumbbell, LuFingerprint, LuIdCard, LuMail, LuMapPin, LuPencil, LuPhone,
  LuPrinter, LuSnowflake, LuTrash2, LuCircleX, LuPlay, LuQrCode, LuMessageCircle, LuSend,
} from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { MemberCardModal } from "@/components/members/member-card-modal";
import { MemberFormModal } from "@/components/members/member-form-modal";
import { SendMemberModal, type SendPreset } from "@/components/members/send-member-modal";
import { SendMenu } from "@/components/members/send-menu";
import { RecordPaymentModal } from "@/components/members/record-payment-modal";
import { SellMembershipModal } from "@/components/members/sell-membership-modal";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Input, PaymentStatusBadge, Segmented, Skeleton, StatusBadge,
  useConfirm, useToast,
} from "@/components/ui";
import { invalidate, useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { daysBetween } from "@/lib/dates";
import { SOURCE_LABEL, type Source } from "@/lib/sources";
import { formatDate, formatDateTime, formatQAR, formatTime, humanize, timeAgo } from "@/lib/format";
import { allowed, can } from "@/lib/permissions";
import { MESSAGE_TYPES } from "@/lib/whatsapp-templates";
import type { AccessResult, MemberDetail, SearchResult } from "@/types/api";

type Tab = "memberships" | "payments" | "visits" | "training";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: m, error, reload } = useApi<MemberDetail>(`/api/members/${id}`);
  const [tab, setTab] = useState<Tab>("memberships");
  const [editing, setEditing] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [selling, setSelling] = useState(false);
  const [paying, setPaying] = useState<{ open: boolean; membershipId?: string; amount?: number; description?: string }>({ open: false });
  const [bioId, setBioId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sending, setSending] = useState<SendPreset | null>(null);

  // Just joined (?welcome=1) or "Send to member" on an invoice (?send=<paymentId>): open the Send window
  const loaded = !!m;
  useEffect(() => {
    if (!loaded) return;
    const q = new URLSearchParams(window.location.search);
    const pay = q.get("send");
    if (q.get("welcome") === "1") setSending({ kind: "welcome" });
    else if (pay) setSending({ kind: "invoice", paymentId: pay });
    if (q.has("welcome") || q.has("send")) window.history.replaceState(null, "", window.location.pathname);
  }, [loaded]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!m)
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );

  const asResult: SearchResult = { id: m.id, code: m.code, name: m.name, phone: m.phone, status: m.status, plan: m.currentMembership?.plan.name ?? null, photoUrl: m.photoUrl };
  const cur = m.currentMembership;
  const totalDays = cur ? Math.max(1, daysBetween(new Date(cur.startDate), new Date(cur.endDate)) + 1) : 1;
  const usedDays = cur ? Math.min(totalDays, Math.max(0, daysBetween(new Date(cur.startDate), new Date()))) : 0;
  const canSell = can(user.role, "memberships", user.gym?.rolePermissions);
  const canPay = can(user.role, "payments", user.gym?.rolePermissions);
  const canMessage = can(user.role, "messages", user.gym?.rolePermissions);

  const checkIn = async () => {
    setBusy("checkin");
    try {
      const r = await api.post<AccessResult>("/api/attendance", { memberId: m.id });
      if (!r.allowed) toast("error", `${r.reason}`);
      else toast("success", r.action === "IN" ? `${m.firstName} checked in` : `${m.firstName} checked out`);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const action = async (membershipId: string, act: "freeze" | "unfreeze" | "cancel") => {
    const ms = m?.memberships.find((x) => x.id === membershipId);
    const left = ms ? ms.plan.freezeDays - ms.freezeDaysUsed : 0;
    if (
      act === "freeze" &&
      !(await confirm({
        title: "Freeze this membership?",
        message: `While it's frozen, ${m?.firstName ?? "the member"} can't check in. When you resume it, the frozen days are added to the end date (${left} freeze day${left === 1 ? "" : "s"} left on this plan).`,
        confirmLabel: "Freeze membership",
      }))
    )
      return;
    if (
      act === "cancel" &&
      !(await confirm({
        title: "Cancel this membership?",
        message: `${m?.firstName ?? "The member"} loses access straight away and this can't be undone. Payments stay on record; any refund is done separately from Payments.`,
        confirmLabel: "Cancel membership",
        danger: true,
      }))
    )
      return;
    setBusy(act);
    try {
      await api.post(`/api/memberships/${membershipId}`, { action: act });
      invalidate("/api/");
      toast("success", act === "freeze" ? "Membership frozen" : act === "unfreeze" ? "Membership resumed and end date extended" : "Membership cancelled");
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const saveBiometric = async () => {
    setBusy("bio");
    try {
      await api.post("/api/biometric/enrollments", { memberId: m.id, biometricId: bioId?.trim() || null });
      toast("success", bioId?.trim() ? "Biometric ID linked" : "Biometric ID removed");
      setBioId(null);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: `Delete ${m.name}?`, message: "This permanently removes the member, their visits and memberships. Payments are kept without a name.", confirmLabel: "Delete member", danger: true })))
      return;
    try {
      await api.del(`/api/members/${m.id}`);
      invalidate("/api/");
      toast("success", "Member deleted");
      router.push("/members");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-5">
      <Link href="/members" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <LuArrowLeft className="h-4 w-4" /> Members
      </Link>

      {/* Hero */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-brand-100 via-brand-50 to-transparent dark:from-brand-500/20 dark:via-brand-500/5" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <button onClick={() => canSell && setEditing(true)} className="shrink-0 rounded-full" aria-label="Change photo">
              <Avatar name={m.name} src={m.photoUrl} size={80} className="ring-4 ring-surface" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold sm:text-2xl">{m.name}</h1>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-muted">{m.code}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-brand-600">
                  <LuPhone className="h-3.5 w-3.5" /> {m.phone}
                </a>
                {m.email && (
                  <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 hover:text-brand-600">
                    <LuMail className="h-3.5 w-3.5" /> {m.email}
                  </a>
                )}
                {m.branch && (
                  <span className="inline-flex items-center gap-1.5">
                    <LuMapPin className="h-3.5 w-3.5" /> {m.branch.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={checkIn} loading={busy === "checkin"}>
              <LuDoorOpen className="h-4 w-4" /> Check in/out
            </Button>
            {canSell && (
              <Button onClick={() => setSelling(true)}>
                <LuIdCard className="h-4 w-4" /> {cur ? "Renew" : "Sell plan"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowCard(true)}>
              <LuQrCode className="h-4 w-4" /> Card
            </Button>
            {canMessage && <SendMenu memberId={m.id} latestInvoiceId={canPay ? (m.payments.find((p) => p.status === "PAID")?.id ?? null) : null} onOpen={setSending} />}
            {canSell && (
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit">
                <LuPencil className="h-4 w-4" />
              </Button>
            )}
            {allowed(user.role, "refunds", user.gym?.rolePermissions) && (
              <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete" className="hover:text-rose-600">
                <LuTrash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="relative grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {[
            ["Total visits", m.stats.totalVisits],
            ["This month", m.stats.visitsThisMonth],
            ["Total paid", formatQAR(m.stats.totalPaid)],
            ["Last visit", m.stats.lastVisit ? timeAgo(m.stats.lastVisit) : "Never"],
          ].map(([label, value], i) => (
            <div key={String(label)} className={`px-5 py-4 ${i > 0 ? "sm:border-l" : ""} ${i % 2 ? "border-l" : ""} border-line ${i > 1 ? "border-t sm:border-t-0" : ""}`}>
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
              <p className="mt-1 font-display text-lg font-semibold text-ink tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Current membership */}
          <Card>
            <CardHeader title="Current membership" icon={<LuIdCard className="h-[18px] w-[18px]" />} />
            {cur ? (
              <div className="space-y-4 px-5 pb-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: cur.plan.color }} />
                  <p className="text-lg font-semibold">{cur.plan.name}</p>
                  <StatusBadge status={cur.effectiveStatus} />
                  <span className="w-full text-sm text-muted sm:ml-auto sm:w-auto">
                    {formatDate(cur.startDate)} → {formatDate(cur.endDate)}
                  </span>
                </div>
                <div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-700 transition-all duration-700" style={{ width: `${(usedDays / totalDays) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    Day {usedDays} of {totalDays}
                    {cur.plan.freezeDays > 0 && ` · ${cur.plan.freezeDays - cur.freezeDaysUsed} freeze days left`}
                  </p>
                </div>
                {cur.balance > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                    <span className="text-amber-800 dark:text-amber-200">
                      Outstanding balance <b className="tabular-nums">{formatQAR(cur.balance)}</b>
                    </span>
                    {canPay && (
                      <Button size="sm" onClick={() => setPaying({ open: true, membershipId: cur.id, amount: cur.balance, description: `${cur.plan.name} balance` })}>
                        Collect
                      </Button>
                    )}
                  </div>
                )}
                {canSell && cur.status !== "CANCELLED" && (
                  <div className="flex flex-wrap gap-2">
                    {cur.status === "FROZEN" ? (
                      <Button size="sm" variant="soft" onClick={() => action(cur.id, "unfreeze")} loading={busy === "unfreeze"}>
                        <LuPlay className="h-3.5 w-3.5" /> Resume (unfreeze)
                      </Button>
                    ) : (
                      cur.plan.freezeDays > 0 && (
                        <Button size="sm" variant="soft" onClick={() => action(cur.id, "freeze")} loading={busy === "freeze"}>
                          <LuSnowflake className="h-3.5 w-3.5" /> Freeze
                        </Button>
                      )
                    )}
                    <Button size="sm" variant="ghost" onClick={() => action(cur.id, "cancel")} className="text-rose-600">
                      <LuCircleX className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={LuIdCard}
                title="No membership yet"
                action={canSell && <Button onClick={() => setSelling(true)}>Sell a plan</Button>}
              />
            )}
          </Card>

          {/* History tabs */}
          <Card>
            <div className="border-b border-line p-4">
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  { value: "memberships", label: "Memberships", count: m.memberships.length },
                  { value: "payments", label: "Payments", count: m.payments.length },
                  { value: "visits", label: "Visits", count: m.attendance.length },
                  { value: "training", label: "Training" },
                ]}
              />
            </div>
            <div className="overflow-x-auto">
              {tab === "memberships" &&
                (m.memberships.length ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Period</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Balance</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {m.memberships.map((ms) => (
                        <tr key={ms.id}>
                          <td className="font-semibold">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: ms.plan.color }} />
                            {ms.plan.name}
                          </td>
                          <td className="whitespace-nowrap text-ink-soft">
                            {formatDate(ms.startDate)} – {formatDate(ms.endDate)}
                          </td>
                          <td className="text-right tabular-nums">{formatQAR(ms.price - ms.discount)}</td>
                          <td className={`text-right tabular-nums ${ms.balance > 0 ? "font-semibold text-amber-600" : "text-muted"}`}>{ms.balance > 0 ? formatQAR(ms.balance) : "–"}</td>
                          <td>
                            <StatusBadge status={ms.status === "CANCELLED" ? "CANCELLED" : ms.effectiveStatus} />
                          </td>
                          <td className="text-right whitespace-nowrap">
                            {(() => {
                              const paid = m.payments.find((p) => p.membershipId === ms.id);
                              return (
                                <span className="inline-flex gap-1.5">
                                  {paid && (
                                    <Link href={`/invoice/${paid.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-surface-2">
                                      <LuPrinter className="h-3.5 w-3.5" /> Invoice
                                    </Link>
                                  )}
                                  {ms.balance > 0 && canPay && ms.status !== "CANCELLED" && (
                                    <button
                                      type="button"
                                      onClick={() => setPaying({ open: true, membershipId: ms.id, amount: ms.balance, description: `${ms.plan.name} ${paid ? "balance" : "membership"}` })}
                                      className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                                    >
                                      {paid ? "Collect balance" : "Take payment"}
                                    </button>
                                  )}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState title="No memberships" />
                ))}
              {tab === "payments" && canPay && (
                <div className="flex justify-end px-4 pt-3">
                  <Button size="sm" variant="soft" onClick={() => setPaying({ open: true })}>
                    Record a payment
                  </Button>
                </div>
              )}
              {tab === "payments" &&
                (m.payments.length ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>For</th>
                        <th>Method</th>
                        <th className="text-right">Amount</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {m.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="font-mono text-xs">{p.invoiceNo}</td>
                          <td className="whitespace-nowrap text-ink-soft">{formatDate(p.paidAt)}</td>
                          <td className="text-ink-soft">{p.description ?? "–"}</td>
                          <td>{humanize(p.method)}</td>
                          <td className="text-right font-semibold tabular-nums">
                            {formatQAR(p.amount)} {p.status !== "PAID" && <PaymentStatusBadge status={p.status} />}
                          </td>
                          <td className="text-right">
                            <span className="inline-flex gap-1.5">
                              {canMessage && (
                                <button
                                  onClick={() => setSending({ kind: "invoice", paymentId: p.id })}
                                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-surface-2"
                                >
                                  <LuSend className="h-3.5 w-3.5" /> Send
                                </button>
                              )}
                              <Link href={`/invoice/${p.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-surface-2">
                                <LuPrinter className="h-3.5 w-3.5" /> Invoice
                              </Link>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState title="No payments yet" message="An invoice is created every time you take a payment. Renewing a plan, Take payment on a balance, or Record a payment here all create one." />
                ))}
              {tab === "visits" &&
                (m.attendance.length ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>In</th>
                        <th>Out</th>
                        <th>Branch</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.attendance.map((a) => (
                        <tr key={a.id}>
                          <td className="whitespace-nowrap">{formatDate(a.checkInAt)}</td>
                          <td className="tabular-nums">{formatTime(a.checkInAt)}</td>
                          <td className="tabular-nums text-ink-soft">{a.checkOutAt ? formatTime(a.checkOutAt) : <Badge tone="green" dot>Inside</Badge>}</td>
                          <td className="text-ink-soft">{a.branch?.name ?? "–"}</td>
                          <td>
                            <Badge tone={a.source === "BIOMETRIC" ? "brand" : "gray"}>{humanize(a.source)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState title="No visits recorded" />
                ))}
              {tab === "training" && (
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Programmes</p>
                    {m.workoutPlans.length === 0 && <p className="text-sm text-muted">No programme assigned.</p>}
                    {m.workoutPlans.map((w) => (
                      <Link key={w.id} href={`/workouts?plan=${w.id}`} className="mb-2 flex items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-200">
                        <LuDumbbell className="h-5 w-5 text-brand-500" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{w.name}</p>
                          <p className="truncate text-xs text-muted">
                            {w._count.items} exercises · {w.trainer?.name ?? "No trainer"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Recent workouts & classes</p>
                    {m.workoutLogs.map((l) => (
                      <p key={l.id} className="flex justify-between border-b border-line/60 py-2 text-sm">
                        <span className="text-ink-soft">{formatDateTime(l.loggedAt)}</span>
                        <span className="font-semibold tabular-nums">{l.durationMin} min</span>
                      </p>
                    ))}
                    {m.bookings.map((b) => (
                      <p key={b.id} className="flex justify-between border-b border-line/60 py-2 text-sm">
                        <span className="text-ink-soft">{b.gymClass.name} · {formatDate(b.gymClass.startsAt)}</span>
                        <Badge tone={b.status === "ATTENDED" ? "green" : b.status === "NO_SHOW" ? "red" : "gray"}>{humanize(b.status)}</Badge>
                      </p>
                    ))}
                    {m.workoutLogs.length + m.bookings.length === 0 && <p className="text-sm text-muted">Nothing logged yet.</p>}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Profile" />
            <dl className="space-y-3 px-5 pb-5 text-sm">
              {[
                ["QID", m.qid],
                ["Nationality", m.nationality],
                ["Gender", m.gender ? humanize(m.gender) : null],
                ["Date of birth", m.dateOfBirth ? formatDate(m.dateOfBirth) : null],
                ["Emergency", m.emergencyName ? `${m.emergencyName}${m.emergencyPhone ? ` · ${m.emergencyPhone}` : ""}` : null],
                ["Member since", formatDate(m.createdAt)],
                ["Joined for", m.ptOnly ? "Personal training only" : "Gym membership"],
                ["Sold by", m.soldBy?.name ?? null],
                ["Found us via", m.source ? SOURCE_LABEL[m.source as Source] ?? m.source : null],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v || "–"}</dd>
                </div>
              ))}
            </dl>
            {m.notes && <p className="mx-5 mb-5 rounded-xl bg-surface-2 p-3 text-sm text-ink-soft">{m.notes}</p>}
          </Card>

          {m.ptPackages.length > 0 && (
            <Card>
              <CardHeader title="Personal training" action={<Link href="/pt" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Open PT</Link>} />
              <ul className="space-y-3 px-5 pb-5">
                {m.ptPackages.map((p) => (
                  <li key={p.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-ink">{p.name}</span>
                      <span className="text-xs text-muted tabular-nums">
                        {p.sessionsUsed}/{p.sessionsTotal} done
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {p.trainer ? `With ${p.trainer.name}` : "No trainer"} · {p.status === "ACTIVE" ? `${p.sessionsTotal - p.sessionsUsed} left` : humanize(p.status)}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full brand-gradient" style={{ width: `${Math.min(100, (p.sessionsUsed / p.sessionsTotal) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Biometric access" subtitle="The user ID this member has on the device" icon={<LuFingerprint className="h-[18px] w-[18px]" />} />
            <div className="space-y-3 px-5 pb-5">
              {m.biometricId && bioId === null ? (
                <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
                  <div>
                    <p className="text-xs text-muted">Device user ID</p>
                    <p className="font-mono text-lg font-semibold text-brand-700 dark:text-brand-200">{m.biometricId}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setBioId(m.biometricId ?? "")}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder={`e.g. ${m.code.replace("M-", "")}`}
                    value={bioId ?? ""}
                    onChange={(e) => setBioId(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted">Enroll the fingerprint/face on the device under this ID, then save it here.</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveBiometric} loading={busy === "bio"}>
                      Save
                    </Button>
                    {m.biometricId && (
                      <Button size="sm" variant="ghost" onClick={() => setBioId(null)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              )}
              {m.biometricEnrolled && <p className="text-xs text-muted">Linked {formatDate(m.biometricEnrolled)}</p>}
            </div>
          </Card>

          {canMessage && (
            <Card>
              <CardHeader
                title="WhatsApp history"
                subtitle="Last 10 messages"
                icon={<LuMessageCircle className="h-[18px] w-[18px]" />}
                action={
                  <Link href={`/messages?member=${m.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                    View all
                  </Link>
                }
              />
              <div className="px-5 pb-5">
                {m.messages.length === 0 && <p className="text-sm text-muted">No messages sent yet.</p>}
                <ul className="divide-y divide-line/70">
                  {m.messages.map((msg) => (
                    <li key={msg.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{MESSAGE_TYPES.find((t) => t.type === msg.type)?.label ?? humanize(msg.type)}</p>
                        <p className="text-xs text-muted">{timeAgo(msg.createdAt)}</p>
                      </div>
                      <Badge tone={msg.status === "FAILED" ? "red" : msg.status === "READ" ? "brand" : msg.status === "DELIVERED" ? "green" : "gray"}>
                        {msg.channel === "LINK" ? "Opened" : humanize(msg.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>

      {canMessage && <SendMemberModal open={!!sending} onClose={() => setSending(null)} member={canPay ? m : { ...m, payments: [] }} preset={sending ?? { kind: "custom" }} />}
      <MemberCardModal open={showCard} onClose={() => setShowCard(false)} member={m} onChanged={reload} />
      <MemberFormModal open={editing} onClose={() => setEditing(false)} member={m} onSaved={() => reload()} />
      <SellMembershipModal open={selling} onClose={() => setSelling(false)} member={asResult} onDone={reload} />
      <RecordPaymentModal
        open={paying.open}
        onClose={() => setPaying({ open: false })}
        member={asResult}
        membershipId={paying.membershipId}
        defaultAmount={paying.amount}
        defaultDescription={paying.description}
        onDone={reload}
      />
    </div>
  );
}
