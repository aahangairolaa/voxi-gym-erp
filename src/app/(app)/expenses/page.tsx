"use client";
import { useState } from "react";
import { LuChevronLeft, LuChevronRight, LuPlus, LuSettings2, LuTrash2, LuWallet, LuX } from "react-icons/lu";
import { BarsList } from "@/components/charts";
import { PaymentMethodPicker } from "@/components/members/payment-fields";
import { Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, StatCard, useConfirm, useToast } from "@/components/ui";
import { useUser } from "@/components/layout/session-context";
import { useApi } from "@/hooks/use-api";
import { useBranches } from "@/hooks/use-lookups";
import { api, withQuery } from "@/lib/api-client";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { addDays, addMonths, fromDateInput, qatarParts, startOfMonth, toDateInput } from "@/lib/dates";

type Period = "day" | "month" | "year" | "custom";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The from/to dates (inclusive) and a label for a day, month or year around an anchor date. */
function rangeOf(period: Exclude<Period, "custom">, anchor: string) {
  const d = fromDateInput(anchor);
  const { year, month, day } = qatarParts(d);
  if (period === "day") return { from: anchor, to: anchor, label: `${day} ${MONTHS[month]!.slice(0, 3)} ${year}` };
  if (period === "month") {
    const first = startOfMonth(d);
    return { from: toDateInput(first), to: toDateInput(addDays(addMonths(first, 1), -1)), label: `${MONTHS[month]} ${year}` };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: String(year) };
}
function step(period: Exclude<Period, "custom">, anchor: string, dir: number) {
  const d = fromDateInput(anchor);
  if (period === "day") return toDateInput(addDays(d, dir));
  if (period === "month") return toDateInput(addMonths(d, dir));
  return `${qatarParts(d).year + dir}-01-01`;
}
import { formatDate, formatQAR, humanize } from "@/lib/format";
import type { Expense } from "@/types/api";

export default function ExpensesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const branches = useBranches();
  const user = useUser();
  const canManage = user.role === "OWNER" || user.role === "MANAGER";
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState(toDateInput());
  const [customFrom, setCustomFrom] = useState(toDateInput(startOfMonth()));
  const [customTo, setCustomTo] = useState(toDateInput());
  const r = period === "custom" ? { from: customFrom, to: customTo, label: "" } : rangeOf(period, anchor);
  const { from, to } = r;
  const today = toDateInput();
  const atLatest = period !== "custom" && rangeOf(period, anchor).to >= today;
  const cats_ = useApi<{ categories: string[]; custom: string[] }>("/api/expenses/categories");
  const categories = cats_.data?.categories ?? EXPENSE_CATEGORIES;
  const [managing, setManaging] = useState(false);
  const [newCat, setNewCat] = useState("");
  const { data, loading, reload } = useApi<{ expenses: Expense[]; total: number; byCategory: Record<string, number> }>(withQuery("/api/expenses", { from, to }));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category: "Utilities", description: "", amount: 0, method: "BANK_TRANSFER", spentAt: toDateInput(), branchId: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/expenses", { ...form, description: form.description || null, branchId: form.branchId || null });
      toast("success", "Expense added");
      setAdding(false);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e: Expense) => {
    if (!(await confirm({ title: "Delete this expense?", danger: true, confirmLabel: "Delete" }))) return;
    await api.del(`/api/expenses/${e.id}`);
    reload();
  };

  const cats = Object.entries(data?.byCategory ?? {}).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Rent, salaries, utilities and everything you spend"
        actions={
          <>
            {canManage && (
              <Button variant="secondary" onClick={() => setManaging(true)}>
                <LuSettings2 className="h-4 w-4" /> Categories
              </Button>
            )}
            <Button onClick={() => setAdding(true)}>
              <LuPlus className="h-4 w-4" /> Add expense
            </Button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setAnchor(toDateInput());
          }}
          options={[
            { value: "day" as const, label: "Day" },
            { value: "month" as const, label: "Month" },
            { value: "year" as const, label: "Year" },
            { value: "custom" as const, label: "Custom" },
          ]}
        />
        {period !== "custom" ? (
          <>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
              <button type="button" onClick={() => setAnchor(step(period, anchor, -1))} aria-label="Previous" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
                <LuChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-36 px-2 text-center text-sm font-semibold text-ink">{r.label}</span>
              <button type="button" disabled={atLatest} onClick={() => setAnchor(step(period, anchor, 1))} aria-label="Next" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                <LuChevronRight className="h-4 w-4" />
              </button>
            </div>
            {period === "day" && <Input type="date" value={anchor} max={today} onChange={(e) => e.target.value && setAnchor(e.target.value)} className="w-auto" />}
            {!atLatest && (
              <button type="button" onClick={() => setAnchor(today)} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Back to today
              </button>
            )}
          </>
        ) : (
          <>
            <Input type="date" value={customFrom} max={customTo} onChange={(e) => e.target.value && setCustomFrom(e.target.value)} className="w-auto" aria-label="From" />
            <span className="text-sm text-muted">to</span>
            <Input type="date" value={customTo} min={customFrom} max={today} onChange={(e) => e.target.value && setCustomTo(e.target.value)} className="w-auto" aria-label="To" />
          </>
        )}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <StatCard accent label="Total spent" value={data ? formatQAR(data.total) : "–"} hint={data ? `${data.expenses.length} entries` : undefined} icon={<LuWallet className="h-[18px] w-[18px]" />} />
          <Card>
            <CardHeader title="By category" />
            <div className="px-5 pb-5">{data ? <BarsList data={cats} format={formatQAR} /> : <Skeleton className="h-40" />}</div>
          </Card>
        </div>
        <Card className="lg:col-span-2">
          {loading && <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>}
          {data && data.expenses.length === 0 && <EmptyState icon={LuWallet} title="No expenses in this period" />}
          {data && data.expenses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table min-w-[640px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Branch</th>
                    <th className="text-right">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap">{formatDate(e.spentAt)}</td>
                      <td>
                        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold">{e.category}</span>
                      </td>
                      <td className="text-ink-soft">
                        {e.description ?? "–"}
                        <p className="text-[11px] text-muted">{humanize(e.method)}</p>
                      </td>
                      <td className="text-ink-soft">{e.branch ?? "–"}</td>
                      <td className="text-right font-semibold tabular-nums">{formatQAR(e.amount)}</td>
                      <td className="text-right">
                        <button onClick={() => remove(e)} className="rounded-lg p-1.5 text-muted hover:text-rose-600" aria-label="Delete">
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add expense" footer={<Button onClick={save} loading={saving} disabled={form.amount <= 0}>Save</Button>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => {
                if (e.target.value === "__new") {
                  setAdding(false);
                  setManaging(true);
                } else setForm({ ...form, category: e.target.value });
              }}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
              {canManage && <option value="__new">+ Add a new category…</option>}
            </Select>
          </Field>
          <Field label="Amount (QAR)" required>
            <Input type="number" min={1} value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.spentAt} onChange={(e) => setForm({ ...form, spentAt: e.target.value })} />
          </Field>
          <Field label="Branch">
            <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">All / head office</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Kahramaa bill, October" />
          </Field>
          <div className="sm:col-span-2">
            <span className="label">Paid by</span>
            <PaymentMethodPicker value={form.method} onChange={(v) => setForm({ ...form, method: v })} />
            {form.method === "CASH" && <p className="mt-2 text-xs text-muted">Cash expenses are taken out of the open cash drawer.</p>}
          </div>
        </div>
      </Modal>
      <Modal open={managing} onClose={() => setManaging(false)} title="Expense categories" description="The built-in ones are always there. Add your own, like Supplements stock or Event costs.">
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATEGORIES.map((c) => (
            <span key={c} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-soft">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-5 mb-2 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Your categories</p>
        {(cats_.data?.custom ?? []).length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(cats_.data?.custom ?? []).map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full border border-brand-300 bg-brand-50 py-1 pr-1.5 pl-2.5 text-xs font-semibold text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300">
                {c}
                <button
                  type="button"
                  aria-label={`Remove ${c}`}
                  onClick={async () => {
                    await api.put("/api/expenses/categories", { custom: (cats_.data?.custom ?? []).filter((x) => x !== c) }).catch(() => {});
                    cats_.reload();
                  }}
                  className="rounded-full p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/20"
                >
                  <LuX className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const c = newCat.trim();
            if (c.length < 2) return;
            try {
              await api.put("/api/expenses/categories", { custom: [...(cats_.data?.custom ?? []), c] });
              setNewCat("");
              cats_.reload();
              setForm((f) => ({ ...f, category: c }));
              toast("success", `${c} added`);
            } catch (err) {
              toast("error", err instanceof Error ? err.message : "Failed");
            }
          }}
        >
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category, e.g. Supplements stock" maxLength={40} className="flex-1" />
          <Button type="submit" disabled={newCat.trim().length < 2}>
            Add
          </Button>
        </form>
      </Modal>
    </>
  );
}
