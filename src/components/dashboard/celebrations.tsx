"use client";
import { useState } from "react";
import Link from "next/link";
import { LuCake, LuCheck, LuMedal, LuMessageCircle, LuPartyPopper } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { Avatar, Badge, Button, Card, CardHeader, Skeleton } from "@/components/ui";
import { useWhatsApp } from "@/components/whatsapp/use-whatsapp";
import { useApi } from "@/hooks/use-api";
import { can } from "@/lib/permissions";
import type { CelebrationsResponse } from "@/types/api";

/** Dashboard card: birthdays this week and visit milestones (10th, 25th, 50th … visit). */
export function Celebrations() {
  const user = useUser();
  const send = useWhatsApp();
  const { data, reload } = useApi<CelebrationsResponse>("/api/celebrations", { refreshMs: 300_000 });
  const [busy, setBusy] = useState<string | null>(null);
  const canMessage = can(user.role, "messages", user.gym?.rolePermissions);

  const greet = async (key: string, memberId: string, type: "BIRTHDAY" | "MILESTONE", visits?: number) => {
    setBusy(key);
    await send(memberId, type, visits ? { extra: { visits: String(visits) } } : {});
    setBusy(null);
    reload();
  };

  const empty = data && data.birthdays.length === 0 && data.milestones.length === 0;

  return (
    <Card>
      <CardHeader title="Celebrations" subtitle="Birthdays this week & visit milestones" icon={<LuPartyPopper className="h-[18px] w-[18px]" />} />
      <ul className="max-h-[420px] space-y-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
        {!data && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="mx-3 my-3 h-10" />)}
        {empty && (
          <li className="px-3 py-8 text-center">
            <p className="text-3xl">🎈</p>
            <p className="mt-2 text-sm font-semibold text-ink">Nothing to celebrate this week</p>
            <p className="text-xs text-muted">Add dates of birth to members to see their birthdays here.</p>
          </li>
        )}
        {data?.birthdays.map((b) => (
          <li key={`b-${b.memberId}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
            <div className="relative">
              <Avatar name={b.name} src={b.photoUrl} size={38} />
              <span className="absolute -right-1.5 -bottom-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-pink-500 text-white ring-2 ring-surface">
                <LuCake className="h-2.5 w-2.5" />
              </span>
            </div>
            <Link href={`/members/${b.memberId}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink hover:text-brand-600">{b.name}</p>
              <p className="truncate text-xs text-muted">
                Turns {b.turning} · {b.daysAway === 0 ? "today" : b.daysAway === 1 ? "tomorrow" : `in ${b.daysAway} days`}
              </p>
            </Link>
            {b.daysAway === 0 && <Badge tone="brand">Today</Badge>}
            {canMessage && (
              <Button size="sm" variant={b.greetedAt ? "ghost" : "secondary"} loading={busy === `b-${b.memberId}`} onClick={() => greet(`b-${b.memberId}`, b.memberId, "BIRTHDAY")}>
                {b.greetedAt ? <LuCheck className="h-3.5 w-3.5 text-emerald-600" /> : <LuMessageCircle className="h-3.5 w-3.5 text-emerald-600" />}
                <span className="hidden sm:inline">{b.greetedAt ? "Wished" : "Wish"}</span>
              </Button>
            )}
          </li>
        ))}
        {data?.milestones.map((m) => (
          <li key={`m-${m.memberId}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
            <div className="relative">
              <Avatar name={m.name} src={m.photoUrl} size={38} />
              <span className="absolute -right-1.5 -bottom-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-amber-500 text-white ring-2 ring-surface">
                <LuMedal className="h-2.5 w-2.5" />
              </span>
            </div>
            <Link href={`/members/${m.memberId}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink hover:text-brand-600">{m.name}</p>
              <p className="truncate text-xs text-muted">Reached {m.milestone} visits</p>
            </Link>
            <Badge tone="amber">{m.milestone}</Badge>
            {canMessage && (
              <Button
                size="sm"
                variant={m.greetedAt ? "ghost" : "secondary"}
                loading={busy === `m-${m.memberId}`}
                onClick={() => greet(`m-${m.memberId}`, m.memberId, "MILESTONE", m.milestone)}
              >
                {m.greetedAt ? <LuCheck className="h-3.5 w-3.5 text-emerald-600" /> : <LuMessageCircle className="h-3.5 w-3.5 text-emerald-600" />}
                <span className="hidden sm:inline">{m.greetedAt ? "Sent" : "Congrats"}</span>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
