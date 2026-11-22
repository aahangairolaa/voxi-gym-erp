"use client";
import { useState } from "react";
import Link from "next/link";
import { LuCheckCheck, LuCircleAlert, LuExternalLink, LuMessageCircle, LuSend, LuSettings } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Segmented, ShowMore, Skeleton, StatCard } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { useLimit } from "@/hooks/use-limit";
import { useQueryParam } from "@/hooks/use-query-param";
import { withQuery } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { MESSAGE_TYPES } from "@/lib/whatsapp-templates";
import type { MessageStatus, MessagesResponse } from "@/types/api";

const STATUS_TONE: Record<MessageStatus, "green" | "brand" | "red" | "gray" | "blue"> = {
  SENT: "blue",
  DELIVERED: "green",
  READ: "brand",
  FAILED: "red",
  OPENED: "gray",
};
const STATUS_LABEL: Record<MessageStatus, string> = {
  SENT: "Sent",
  DELIVERED: "Delivered",
  READ: "Read",
  FAILED: "Failed",
  OPENED: "Opened in WhatsApp",
};

/** WhatsApp log: every reminder, card, birthday wish and receipt sent to members. */
export default function MessagesPage() {
  const user = useUser();
  const [type, setType] = useState("ALL");
  const memberId = useQueryParam("member");
  const { data, error, loading, reload } = useApi<MessagesResponse>(withQuery("/api/whatsapp/messages", { type, memberId }), { refreshMs: 30_000 });
  const page = useLimit(data?.messages);
  const apiMode = !!user.gym?.whatsappEnabled;
  const c = data?.last30Days ?? {};
  const total = Object.values(c).reduce((a, b) => a + (b ?? 0), 0);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="WhatsApp"
        subtitle={apiMode ? "Sent automatically through your WhatsApp Business number" : "Messages open in WhatsApp with the text ready. Connect the Business API to send automatically"}
        actions={
          can(user.role, "settings", user.gym?.rolePermissions) && (
            <Link href="/settings#whatsapp">
              <Button variant="secondary">
                <LuSettings className="h-4 w-4" /> WhatsApp settings
              </Button>
            </Link>
          )
        }
      />

      <div className="stagger mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard accent label="Messages (30 days)" value={total} icon={<LuMessageCircle className="h-[18px] w-[18px]" />} />
        <StatCard label={apiMode ? "Delivered / read" : "Opened in WhatsApp"} value={apiMode ? (c.DELIVERED ?? 0) + (c.READ ?? 0) : c.OPENED ?? 0} icon={<LuCheckCheck className="h-[18px] w-[18px]" />} />
        <StatCard label="Sent (waiting)" value={c.SENT ?? 0} icon={<LuSend className="h-[18px] w-[18px]" />} />
        <StatCard label="Failed" value={c.FAILED ?? 0} icon={<LuCircleAlert className="h-[18px] w-[18px]" />} />
      </div>

      <div className="mb-4">
        <Segmented
          value={type}
          onChange={setType}
          options={[{ value: "ALL", label: "All" }, ...MESSAGE_TYPES.map((t) => ({ value: t.type as string, label: t.label }))]}
        />
      </div>

      <Card>
        {loading && <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>}
        {data && data.messages.length === 0 && (
          <EmptyState
            icon={LuMessageCircle}
            title="No messages yet"
            message="Send renewal reminders and birthday wishes from the dashboard, or use the WhatsApp button on a member's profile."
          />
        )}
        {data && data.messages.length > 0 && (
          <>
            <ul className="divide-y divide-line/70">
              {page.visible.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4">
                  <div className="w-full sm:w-56 sm:shrink-0">
                    {m.member ? (
                      <Link href={`/members/${m.member.id}`} className="font-semibold text-ink hover:text-brand-600">
                        {m.member.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">+{m.toPhone}</span>
                    )}
                    <p className="text-xs text-muted">
                      {MESSAGE_TYPES.find((t) => t.type === m.type)?.label} · {formatDateTime(m.createdAt)}
                    </p>
                    <p className="text-xs text-muted">{m.sentBy ? `by ${m.sentBy}` : "automatic"}</p>
                  </div>
                  <p className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-emerald-50 px-3.5 py-2.5 text-sm whitespace-pre-line text-ink dark:bg-emerald-500/10">
                    {m.body}
                    {m.error && <span className="mt-1 block text-xs text-rose-600">{m.error}</span>}
                  </p>
                  <div className="flex items-center gap-2 sm:w-44 sm:justify-end">
                    <Badge tone={STATUS_TONE[m.status]} dot>
                      {STATUS_LABEL[m.status]}
                    </Badge>
                    {m.status === "FAILED" && (
                      <a href={`https://wa.me/${m.toPhone}?text=${encodeURIComponent(m.body)}`} target="_blank" rel="noreferrer" title="Send by hand">
                        <LuExternalLink className="h-4 w-4 text-muted hover:text-brand-600" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <ShowMore remaining={page.remaining} onClick={page.more} />
          </>
        )}
      </Card>
    </>
  );
}
