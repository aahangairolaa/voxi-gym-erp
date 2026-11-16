"use client";
import { useState } from "react";
import { LuPlus, LuTrash2, LuWallet } from "react-icons/lu";
import { BarsList } from "@/components/charts";
import { PaymentMethodPicker } from "@/components/members/payment-fields";
import { Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, StatCard, useConfirm, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useBranches } from "@/hooks/use-lookups";
import { api, withQuery } from "@/lib/api-client";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { startOfMonth, toDateInput, addMonths } from "@/lib/dates";
import { formatDate, formatQAR, humanize } from "@/lib/format";
import type { Expense } from "@/types/api";

export default function ExpensesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const branches = useBranches();
  const [from, setFrom] = useState(toDateInput(startOfMonth()));
  const [to, setTo] = useState(toDateInput());
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
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            <Button variant="ghost" size="sm" onClick={() => { setFrom(toDateInput(addMonths(new Date(), -11))); setTo(toDateInput()); }}>
              12 months
            </Button>
            <Button onClick={() => setAdding(true)}>
              <LuPlus className="h-4 w-4" /> Add expense
            </Button>
          </>
        }
      />
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
                        {e.description ?? "—"}
                        <p className="text-[11px] text-muted">{humanize(e.method)}</p>
                      </td>
                      <td className="text-ink-soft">{e.branch ?? "—"}</td>
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
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
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
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Kahramaa bill — October" />
          </Field>
          <div className="sm:col-span-2">
            <span className="label">Paid by</span>
            <PaymentMethodPicker value={form.method} onChange={(v) => setForm({ ...form, method: v })} />
            {form.method === "CASH" && <p className="mt-2 text-xs text-muted">Cash expenses are taken out of the open cash drawer.</p>}
          </div>
        </div>
      </Modal>
    </>
  );
}
