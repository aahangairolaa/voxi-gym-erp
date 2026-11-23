"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LuChevronLeft, LuChevronRight, LuCoffee, LuCrown, LuDumbbell, LuIdCard, LuListPlus, LuPlus, LuReceipt, LuSparkles, LuTrash2, LuTrendingUp, LuUserPlus,
} from "react-icons/lu";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Segmented, Skeleton, StatCard, Toggle, useConfirm, useToast } from "@/components/ui";
import { useUser } from "@/components/layout/session-context";
import { RecordSaleModal } from "@/components/sales/record-sale-modal";
import { useApi } from "@/hooks/use-api";
import { useQueryParam } from "@/hooks/use-query-param";
import { api, fieldErrors } from "@/lib/api-client";
import { addDays, addMonths, fromDateInput, qatarParts, toDateInput } from "@/lib/dates";
import { formatQAR, formatTime, formatDate, humanize } from "@/lib/format";
import { allowed, ROLE_LABEL, type Role } from "@/lib/permissions";
import { SOURCE_LABEL, type Source } from "@/lib/sources";
import { cn } from "@/lib/utils";

type Period = "day" | "month" | "year";
type Kind = "MEMBERSHIP" | "PT" | "EXTRA" | "OTHER" | "CAFE";
type Report = {
  label: string;
  totals: { revenue: number; sales: number; newMembers: number; ptOnlyMembers: number; membershipsSold: number; ptPackagesSold: number; refunded: number; refunds: number };
  byKind: Record<Kind, { amount: number; count: number }>;
  byMethod: { method: string; amount: number }[];
  bySource: { source: string; count: number }[];
  board: { staffId: string | null; name: string; role: Role | null; memberships: number; pt: number; extras: number; revenue: number; sales: number }[];
  sales: { id: string; invoiceNo: string; at: string; kind: Kind; item: string; amount: number; method: string; member: { id: string; name: string; code: string } | null; soldBy: string | null }[];
};
type Extra = { id: string; name: string; price: number; active: boolean };

const KIND: Record<Kind, { label: string; icon: typeof LuIdCard; color: string }> = {
  MEMBERSHIP: { label: "Memberships", icon: LuIdCard, color: "#7c5cff" },
  PT: { label: "Personal training", icon: LuDumbbell, color: "#10b981" },
  EXTRA: { label: "Extras (towel, sauna...)", icon: LuSparkles, color: "#f59e0b" },
  CAFE: { label: "Café", icon: LuCoffee, color: "#ec4899" },
  OTHER: { label: "Other payments", icon: LuReceipt, color: "#64748b" },
};

function shift(period: Period, date: string, dir: number) {
  const d = fromDateInput(date);
  if (period === "day") return toDateInput(addDays(d, dir));
  if (period === "month") return toDateInput(addMonths(d, dir));
  return `${qatarParts(d).year + dir}-01-01`;
}

export default function SalesPage() {
  const user = useUser();
  const perms = user.gym?.rolePermissions;
  const canMoney = allowed(user.role, "revenue", perms);
  const canManage = user.role === "OWNER" || user.role === "MANAGER";
  const initial = useQueryParam("period");
  const [period, setPeriod] = useState<Period>("day");
  const [date, setDate] = useState(() => toDateInput());
  const [recording, setRecording] = useState(false);
  const [priceList, setPriceList] = useState(false);

  useEffect(() => {
    if (initial === "month" || initial === "year") setPeriod(canMoney ? initial : "day");
  }, [initial, canMoney]);

  const { data, loading, reload } = useApi<Report>(`/api/sales?period=${period}&date=${date}`);
  const isToday = period === "day" && date === toDateInput();
  const atNow = date >= toDateInput() || (period === "month" && date.slice(0, 7) === toDateInput().slice(0, 7)) || (period === "year" && date.slice(0, 4) === toDateInput().slice(0, 4));

  const kinds = (Object.keys(KIND) as Kind[]).filter((k) => k !== "CAFE" || (data?.byKind.CAFE.count ?? 0) > 0);
  const maxKind = Math.max(1, ...kinds.map((k) => data?.byKind[k].amount ?? 0));
  const board = data?.board ?? [];
  const topRevenue = Math.max(1, ...board.map((b) => b.revenue));

  return (
    <>
      <PageHeader
        title="Sales"
        subtitle="Everything sold, who sold it and where new members came from"
        actions={
          <>
            {canManage && (
              <Button variant="secondary" onClick={() => setPriceList(true)}>
                <LuListPlus className="h-4 w-4" /> Extras price list
              </Button>
            )}
            <Button onClick={() => setRecording(true)}>
              <LuPlus className="h-4 w-4" /> Record a sale
            </Button>
          </>
        }
      />

      {/* Period + date */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setDate(toDateInput());
          }}
          options={[
            { value: "day" as const, label: "Day" },
            ...(canMoney ? [{ value: "month" as const, label: "Month" }, { value: "year" as const, label: "Year" }] : []),
          ]}
        />
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          <button type="button" onClick={() => setDate(shift(period, date, -1))} aria-label="Previous" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
            <LuChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 px-2 text-center text-sm font-semibold text-ink">{data?.label ?? "…"}</span>
          <button type="button" disabled={atNow} onClick={() => setDate(shift(period, date, 1))} aria-label="Next" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30">
            <LuChevronRight className="h-4 w-4" />
          </button>
        </div>
        {period === "day" && (
          <input type="date" value={date} max={toDateInput()} onChange={(e) => e.target.value && setDate(e.target.value)} className="input h-10 w-auto" aria-label="Pick a day" />
        )}
        {!isToday && (
          <button type="button" onClick={() => setDate(toDateInput())} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Back to today
          </button>
        )}
      </div>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard accent label={isToday ? "Today's sales" : `Sales, ${data.label}`} value={formatQAR(data.totals.revenue)} icon={<LuTrendingUp className="h-4 w-4" />} hint={`${data.totals.sales} sale${data.totals.sales === 1 ? "" : "s"}${data.totals.refunds ? ` · ${formatQAR(data.totals.refunded)} refunded` : ""}`} />
            <StatCard label="New members" value={String(data.totals.newMembers)} icon={<LuUserPlus className="h-4 w-4" />} hint={data.totals.ptOnlyMembers ? `${data.totals.ptOnlyMembers} for PT only` : undefined} />
            <StatCard label="Memberships sold" value={String(data.totals.membershipsSold)} icon={<LuIdCard className="h-4 w-4" />} hint={formatQAR(data.byKind.MEMBERSHIP.amount)} />
            <StatCard label="PT packages sold" value={String(data.totals.ptPackagesSold)} icon={<LuDumbbell className="h-4 w-4" />} hint={formatQAR(data.byKind.PT.amount)} />
          </div>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
            {/* Staff sales board */}
            <Card className="lg:col-span-2">
              <CardHeader title="Sales by staff" subtitle={`Who sold what, ${data.label}`} />
              {board.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted">No sales yet. Choose “Sold by” when you add a member or sell a membership, PT or extra.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table min-w-[560px]">
                    <thead>
                      <tr>
                        <th>Staff</th>
                        <th className="text-right">Memberships</th>
                        <th className="text-right">PT</th>
                        <th className="text-right">Extras</th>
                        <th className="text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.map((b, i) => (
                        <tr key={b.staffId ?? "none"}>
                          <td>
                            <div className="flex items-center gap-3">
                              {b.staffId ? <Avatar name={b.name} size={32} /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs text-muted">?</span>}
                              <div className="min-w-0">
                                <p className={cn("flex items-center gap-1.5 font-medium", b.staffId ? "text-ink" : "text-muted")}>
                                  {b.name}
                                  {i === 0 && b.staffId && b.revenue > 0 && <LuCrown className="h-3.5 w-3.5 text-amber-500" aria-label="Top seller" />}
                                </p>
                                {b.role && <p className="text-xs text-muted">{ROLE_LABEL[b.role]}</p>}
                              </div>
                            </div>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                              <div className="h-full rounded-full brand-gradient" style={{ width: `${(b.revenue / topRevenue) * 100}%` }} />
                            </div>
                          </td>
                          <td className="text-right tabular-nums">{b.memberships}</td>
                          <td className="text-right tabular-nums">{b.pt}</td>
                          <td className="text-right tabular-nums">{b.extras}</td>
                          <td className="text-right font-semibold tabular-nums">{formatQAR(b.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title="By type" />
                <ul className="space-y-3 px-5 pb-5">
                  {kinds.map((k) => {
                    const K = KIND[k];
                    const v = data.byKind[k];
                    return (
                      <li key={k}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="inline-flex items-center gap-2 text-ink-soft">
                            <K.icon className="h-4 w-4" style={{ color: K.color }} /> {K.label}
                          </span>
                          <span className="font-semibold text-ink tabular-nums">{formatQAR(v.amount)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full" style={{ width: `${(v.amount / maxKind) * 100}%`, background: K.color }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
              <Card>
                <CardHeader title="New members by source" subtitle="How they found the gym" />
                {data.bySource.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">No new members in this period.</p>
                ) : (
                  <ul className="space-y-2 px-5 pb-5 text-sm">
                    {data.bySource.map((s) => (
                      <li key={s.source} className="flex justify-between gap-3">
                        <span className="text-ink-soft">{s.source === "NONE" ? "Not recorded" : SOURCE_LABEL[s.source as Source] ?? humanize(s.source)}</span>
                        <span className="font-semibold text-ink tabular-nums">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              {data.byMethod.length > 0 && (
                <Card>
                  <CardHeader title="By payment method" subtitle="Café sales not included" />
                  <ul className="space-y-2 px-5 pb-5 text-sm">
                    {data.byMethod.map((m) => (
                      <li key={m.method} className="flex justify-between gap-3">
                        <span className="text-ink-soft">{humanize(m.method)}</span>
                        <span className="font-semibold text-ink tabular-nums">{formatQAR(m.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>

          <Card className="mt-6">
            <CardHeader title="Every sale" subtitle={data.sales.length >= 300 ? "Latest 300 shown" : `${data.sales.length} in ${data.label}`} />
            {data.sales.length === 0 ? (
              <EmptyState icon={LuReceipt} title="No sales in this period" message="Memberships, PT packages and extras you sell appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>{period === "day" ? "Time" : "Date"}</th>
                      <th>What</th>
                      <th>Member</th>
                      <th>Sold by</th>
                      <th>Method</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales.map((s) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap text-muted tabular-nums">{period === "day" ? formatTime(s.at) : formatDate(s.at)}</td>
                        <td>
                          <span className="font-medium text-ink">{s.item}</span>
                          <Badge tone={s.kind === "PT" ? "green" : s.kind === "EXTRA" ? "amber" : s.kind === "MEMBERSHIP" ? "brand" : "gray"} className="ml-2">
                            {s.kind === "MEMBERSHIP" ? "Membership" : s.kind === "PT" ? "PT" : s.kind === "EXTRA" ? "Extra" : "Other"}
                          </Badge>
                        </td>
                        <td>
                          {s.member ? (
                            <Link href={`/members/${s.member.id}`} className="hover:underline">
                              {s.member.name}
                            </Link>
                          ) : (
                            <span className="text-muted">Walk-in</span>
                          )}
                        </td>
                        <td className={s.soldBy ? "text-ink-soft" : "text-muted"}>{s.soldBy ?? "None"}</td>
                        <td className="text-ink-soft">{humanize(s.method)}</td>
                        <td className="text-right font-semibold tabular-nums">{formatQAR(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}

      <RecordSaleModal
        open={recording}
        onClose={() => setRecording(false)}
        onDone={() => {
          setRecording(false);
          reload();
        }}
      />
      <PriceListModal open={priceList} onClose={() => setPriceList(false)} />
    </>
  );
}

function PriceListModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, reload } = useApi<{ items: Extra[] }>(open ? "/api/extras" : null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const add = async () => {
    setErrors({});
    try {
      await api.post("/api/extras", { name, price, active: true });
      setName("");
      setPrice("");
      reload();
    } catch (e) {
      setErrors(fieldErrors(e));
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };
  const save = async (i: Extra, patch: Partial<Extra>) => {
    try {
      await api.put(`/api/extras/${i.id}`, { name: i.name, price: i.price, active: i.active, ...patch });
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };
  const remove = async (i: Extra) => {
    if (!(await confirm({ title: `Remove ${i.name}?`, message: "Past charges stay in your sales.", confirmLabel: "Remove", danger: true }))) return;
    await api.del(`/api/extras/${i.id}`).catch(() => {});
    reload();
  };

  return (
    <Modal open={open} onClose={onClose} title="Extras price list" description="What you charge for on top of memberships. Change a price any time; past sales keep the price they were sold at.">
      <ul className="divide-y divide-line">
        {(data?.items ?? []).map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2.5">
            <Input defaultValue={i.name} maxLength={60} onBlur={(e) => e.target.value.trim() && e.target.value !== i.name && save(i, { name: e.target.value })} className="flex-1" />
            <div className="relative w-28">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">QAR</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                defaultValue={i.price}
                onBlur={(e) => Number(e.target.value) > 0 && Number(e.target.value) !== i.price && save(i, { price: Number(e.target.value) })}
                className="pl-11 tabular-nums"
              />
            </div>
            <Toggle checked={i.active} onChange={(v) => save(i, { active: v })} label="" />
            <button type="button" onClick={() => remove(i)} aria-label={`Remove ${i.name}`} className="rounded-lg p-1.5 text-muted hover:text-rose-600">
              <LuTrash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-line p-3">
        <Field label="New extra" error={errors.name} className="flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ice bath" maxLength={60} />
        </Field>
        <Field label="Price (QAR)" error={errors.price} className="w-28">
          <Input type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Button className="mt-6" onClick={add} disabled={!name.trim() || !price}>
          Add
        </Button>
      </div>
    </Modal>
  );
}
