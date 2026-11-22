"use client";
import { useState } from "react";
import { LuBanknote, LuLock, LuLockOpen, LuArrowDownLeft, LuArrowUpRight } from "react-icons/lu";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useBranches } from "@/hooks/use-lookups";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTime, formatQAR, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CashSession } from "@/types/api";

/** Cash drawer shifts: open with a float, every cash payment is added, close with a count. */
export default function CashSessionsPage() {
  const toast = useToast();
  const branches = useBranches();
  const { data, loading, reload } = useApi<{ sessions: CashSession[] }>("/api/cash-sessions", { refreshMs: 30_000 });
  const [opening, setOpening] = useState(false);
  const [openForm, setOpenForm] = useState({ branchId: "", openingFloat: 500, notes: "" });
  const [closing, setClosing] = useState<CashSession | null>(null);
  const [counted, setCounted] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const sessions = data?.sessions ?? [];
  const openSessions = sessions.filter((s) => s.status === "OPEN");
  const history = sessions.filter((s) => s.status === "CLOSED");
  const branchesWithoutOpen = branches.filter((b) => !openSessions.some((s) => s.branchId === b.id));

  const open = async () => {
    setSaving(true);
    try {
      await api.post("/api/cash-sessions", { ...openForm, notes: openForm.notes || null });
      toast("success", "Cash drawer opened");
      setOpening(false);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const close = async () => {
    if (!closing || counted === "") return;
    setSaving(true);
    try {
      await api.post(`/api/cash-sessions/${closing.id}/close`, { countedCash: counted, notes: notes || null });
      const diff = counted - closing.totals.expected;
      toast(diff === 0 ? "success" : "info", diff === 0 ? "Drawer balanced perfectly" : `Closed with a ${diff > 0 ? "surplus" : "shortage"} of ${formatQAR(Math.abs(diff))}`);
      setClosing(null);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const diffNow = closing && counted !== "" ? counted - closing.totals.expected : null;

  return (
    <>
      <PageHeader
        title="Cash sessions"
        subtitle="Open the drawer each shift and close it with a count. Differences are flagged"
        actions={
          branchesWithoutOpen.length > 0 && (
            <Button onClick={() => { setOpenForm({ branchId: branchesWithoutOpen[0]!.id, openingFloat: 500, notes: "" }); setOpening(true); }}>
              <LuLockOpen className="h-4 w-4" /> Open drawer
            </Button>
          )
        }
      />

      {loading && <Skeleton className="mb-5 h-52 rounded-2xl" />}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {openSessions.map((s) => (
          <Card key={s.id} className="relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
            <CardHeader
              title={`${s.branch.name} drawer`}
              subtitle={`Opened ${formatTime(s.openedAt)} by ${s.openedBy}`}
              icon={<LuBanknote className="h-[18px] w-[18px]" />}
              action={<Badge tone="green" dot>Open</Badge>}
            />
            <div className="relative grid grid-cols-3 gap-3 px-5">
              <div className="rounded-xl bg-surface-2/70 p-3">
                <p className="text-[11px] font-semibold text-muted uppercase">Float</p>
                <p className="mt-1 font-semibold tabular-nums">{formatQAR(s.openingFloat)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 uppercase dark:text-emerald-300">
                  <LuArrowDownLeft className="h-3 w-3" /> Cash in
                </p>
                <p className="mt-1 font-semibold tabular-nums">{formatQAR(s.totals.cashIn)}</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10">
                <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 uppercase dark:text-rose-300">
                  <LuArrowUpRight className="h-3 w-3" /> Paid out
                </p>
                <p className="mt-1 font-semibold tabular-nums">{formatQAR(s.totals.cashOut)}</p>
              </div>
            </div>
            <div className="relative flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs text-muted">Expected in drawer</p>
                <p className="font-display text-3xl font-semibold tabular-nums">{formatQAR(s.totals.expected)}</p>
                <p className="text-xs text-muted">{s.totals.transactions} cash payments</p>
              </div>
              <Button onClick={() => { setClosing(s); setCounted(""); setNotes(""); }}>
                <LuLock className="h-4 w-4" /> Close & count
              </Button>
            </div>
          </Card>
        ))}
        {data && openSessions.length === 0 && (
          <Card className="lg:col-span-2">
            <EmptyState icon={LuLockOpen} title="No drawer is open" message="Open a cash session at the start of the shift so cash payments are tracked." />
          </Card>
        )}
      </div>

      <Card>
        <CardHeader title="History" subtitle="Closed sessions" />
        <div className="overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Branch</th>
                <th>Staff</th>
                <th className="text-right">Float</th>
                <th className="text-right">Cash in</th>
                <th className="text-right">Expected</th>
                <th className="text-right">Counted</th>
                <th className="text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">
                    {formatDate(s.openedAt)}
                    <p className="text-[11px] text-muted">
                      {formatTime(s.openedAt)} – {s.closedAt ? formatTime(s.closedAt) : ""}
                    </p>
                  </td>
                  <td>{s.branch.name}</td>
                  <td className="text-ink-soft">{s.closedBy ?? s.openedBy}</td>
                  <td className="text-right tabular-nums">{formatQAR(s.openingFloat)}</td>
                  <td className="text-right tabular-nums">{formatQAR(s.totals.cashIn)}</td>
                  <td className="text-right tabular-nums">{formatQAR(s.expectedCash)}</td>
                  <td className="text-right tabular-nums">{formatQAR(s.countedCash)}</td>
                  <td className="text-right">
                    <span
                      className={cn(
                        "rounded-lg px-2 py-1 text-xs font-semibold tabular-nums",
                        !s.difference
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : s.difference < 0
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                      )}
                      title={s.notes ?? undefined}
                    >
                      {!s.difference ? "Balanced" : `${s.difference > 0 ? "+" : "−"}${formatQAR(Math.abs(s.difference))}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={opening} onClose={() => setOpening(false)} title="Open cash drawer" footer={<Button onClick={open} loading={saving}>Open drawer</Button>}>
        <div className="space-y-4">
          <Field label="Branch">
            <Select value={openForm.branchId} onChange={(e) => setOpenForm({ ...openForm, branchId: e.target.value })}>
              {branchesWithoutOpen.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Opening float (QAR)" hint="Cash already in the drawer for change">
            <Input type="number" min={0} value={openForm.openingFloat} onChange={(e) => setOpenForm({ ...openForm, openingFloat: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={openForm.notes} onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!closing}
        onClose={() => setClosing(null)}
        title="Close & count drawer"
        description={closing ? `${closing.branch.name} · opened ${formatDateTime(closing.openedAt)}` : ""}
        footer={<Button onClick={close} loading={saving} disabled={counted === ""}>Close session</Button>}
      >
        {closing && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface-2/60 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">Opening float</span><span className="tabular-nums">{formatQAR(closing.openingFloat)}</span></div>
              <div className="flex justify-between"><span className="text-muted">+ Cash payments</span><span className="tabular-nums">{formatQAR(closing.totals.cashIn)}</span></div>
              <div className="flex justify-between"><span className="text-muted">− Paid out</span><span className="tabular-nums">{formatQAR(closing.totals.cashOut)}</span></div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold"><span>Expected</span><span className="tabular-nums">{formatQAR(closing.totals.expected)}</span></div>
            </div>
            <Field label="Cash counted (QAR)" required>
              <Input type="number" min={0} autoFocus value={counted} onChange={(e) => setCounted(e.target.value === "" ? "" : Number(e.target.value))} className="h-12 text-lg font-semibold" />
            </Field>
            {diffNow !== null && (
              <p className={cn("rounded-xl px-3 py-2 text-sm font-semibold", diffNow === 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10" : diffNow < 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10")}>
                {diffNow === 0 ? "Balanced" : diffNow < 0 ? `Short by ${formatQAR(-diffNow)}` : `Over by ${formatQAR(diffNow)}`}
              </p>
            )}
            <Field label="Notes" hint="Explain any difference">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
