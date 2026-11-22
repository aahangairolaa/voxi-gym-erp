"use client";
import { useState } from "react";
import Link from "next/link";
import { LuBellRing, LuCheck, LuMessageCircle } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Segmented, Skeleton, useConfirm, useToast } from "@/components/ui";
import { useWhatsApp } from "@/components/whatsapp/use-whatsapp";
import { invalidate, useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { formatDate, timeAgo } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { ReminderItem, RemindersResponse, SearchResult } from "@/types/api";

/**
 * Dashboard card: members whose plan ends soon (or ended in the last 2 weeks),
 * with one-tap WhatsApp reminders and a "Remind all" for the Business API.
 */
export function RenewalReminders({ onRenew }: { onRenew: (m: SearchResult) => void }) {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const send = useWhatsApp();
  const { data, reload } = useApi<RemindersResponse>("/api/reminders", { refreshMs: 120_000 });
  const [tab, setTab] = useState<"expiring" | "expired">("expiring");
  const [busy, setBusy] = useState<string | null>(null);
  const canMessage = can(user.role, "messages");
  const canSell = can(user.role, "memberships");
  const apiMode = !!user.gym?.whatsappEnabled;

  const list = data ? data[tab] : [];
  const weekAgo = Date.now() - 7 * 86_400_000;
  const recently = (r: ReminderItem) => !!r.lastRemindedAt && new Date(r.lastRemindedAt).getTime() > weekAgo;
  const pending = list.filter((r) => !recently(r));

  const remind = async (r: ReminderItem) => {
    setBusy(r.memberId);
    await send(r.memberId, tab === "expiring" ? "RENEWAL_REMINDER" : "EXPIRED");
    setBusy(null);
    reload();
  };

  const remindAll = async () => {
    if (!pending.length) return;
    const ok = await confirm({
      title: `Send ${pending.length} WhatsApp reminder${pending.length > 1 ? "s" : ""}?`,
      message: "Members reminded in the last 7 days are skipped.",
      confirmLabel: "Send all",
    });
    if (!ok) return;
    setBusy("all");
    try {
      const r = await api.post<{ sent: number; failed: number }>("/api/whatsapp/bulk", {
        memberIds: pending.map((p) => p.memberId),
        type: tab === "expiring" ? "RENEWAL_REMINDER" : "EXPIRED",
      });
      toast(r.failed ? "error" : "success", `${r.sent} sent${r.failed ? `, ${r.failed} failed, see the WhatsApp log` : ""}`);
      invalidate("/api/whatsapp/messages");
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Renewal reminders"
        subtitle={data ? `${data.summary.notReminded} not reminded this week` : "Members to contact"}
        icon={<LuBellRing className="h-[18px] w-[18px]" />}
        action={
          canMessage && apiMode && pending.length > 1 ? (
            <Button size="sm" variant="soft" onClick={remindAll} loading={busy === "all"}>
              <LuMessageCircle className="h-3.5 w-3.5" /> Remind all ({pending.length})
            </Button>
          ) : (
            <Link href="/memberships?status=EXPIRING" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
              View all
            </Link>
          )
        }
      />
      <div className="px-5 pb-2">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "expiring", label: `Ending in ${data?.warnDays ?? 7} days${data ? ` · ${data.summary.expiring}` : ""}` },
            { value: "expired", label: `Recently expired${data ? ` · ${data.summary.expired}` : ""}` },
          ]}
        />
      </div>
      <ul className="max-h-[420px] divide-y divide-line/70 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {!data && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="mx-3 my-3 h-10" />)}
        {data && list.length === 0 && (
          <EmptyState
            title={tab === "expiring" ? "Nobody is expiring soon" : "No recent expiries"}
            message={tab === "expiring" ? "Great retention!" : `Nobody's plan ended in the last ${data.expiredLookbackDays} days.`}
          />
        )}
        {list.map((r) => (
          <li key={r.memberId} className="flex items-center gap-3 px-3 py-3">
            <Avatar name={r.name} src={r.photoUrl} size={38} />
            <Link href={`/members/${r.memberId}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink hover:text-brand-600">{r.name}</p>
              <p className="truncate text-xs text-muted">
                {r.plan} · {tab === "expiring" ? "ends" : "ended"} {formatDate(r.endDate)}
                {r.lastRemindedAt && <span className="text-emerald-600 dark:text-emerald-400"> · reminded {timeAgo(r.lastRemindedAt)}</span>}
              </p>
            </Link>
            <Badge tone={tab === "expired" ? "red" : r.daysLeft <= 2 ? "red" : "amber"}>
              {tab === "expired" ? `${Math.abs(r.daysLeft)}d ago` : r.daysLeft <= 0 ? "Today" : `${r.daysLeft}d left`}
            </Badge>
            {canMessage && (
              <Button
                size="sm"
                variant={recently(r) ? "ghost" : "secondary"}
                onClick={() => remind(r)}
                loading={busy === r.memberId}
                aria-label={`Send WhatsApp reminder to ${r.name}`}
                title={recently(r) ? "Reminded this week. Send again" : "Send WhatsApp reminder"}
              >
                {recently(r) ? <LuCheck className="h-3.5 w-3.5 text-emerald-600" /> : <LuMessageCircle className="h-3.5 w-3.5 text-emerald-600" />}
                <span className="hidden sm:inline">{recently(r) ? "Sent" : "Remind"}</span>
              </Button>
            )}
            {canSell && (
              <Button
                size="sm"
                variant="soft"
                onClick={() => onRenew({ id: r.memberId, code: r.code, name: r.name, phone: r.phone, status: tab === "expired" ? "EXPIRED" : "EXPIRING", plan: r.plan, photoUrl: r.photoUrl })}
              >
                Renew
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
