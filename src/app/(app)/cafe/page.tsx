"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LuBanknote, LuCheck, LuCoffee, LuCreditCard, LuLock, LuMinus, LuPencil, LuPlus, LuReceipt, LuSearch, LuSparkles,
  LuTrash2, LuUsers, LuX,
} from "react-icons/lu";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, StatCard, Toggle, useConfirm, useToast } from "@/components/ui";
import { useUser } from "@/components/layout/session-context";
import { useApi } from "@/hooks/use-api";
import { api, fieldErrors } from "@/lib/api-client";
import {
  CAFE_CATEGORY_LABEL, CAFE_FEATURES, DEMO_ITEMS, DEMO_SALES, DEMO_TEAM, DEMO_TODAY,
  type CafeCategory, type CafeItemView, type CafeSaleView, type CafeTeamView,
} from "@/lib/cafe-demo";
import { CAFE_PRICE_YEAR, MAX_CAFE_ITEMS } from "@/lib/pricing";
import { formatQAR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type Today = typeof DEMO_TODAY;
type CafeData =
  | { enabled: false; price: number; priceForTerm: number; maxItems: number }
  | { enabled: true; maxItems: number; items: CafeItemView[]; today: Today; recent: CafeSaleView[]; team: CafeTeamView[]; staff: CafeTeamView[] };

type Method = "CASH" | "CARD" | "TRANSFER";
type CartLine = { item: CafeItemView; qty: number };
type MemberHit = { id: string; firstName: string; lastName: string; code: string };

const CATEGORIES = Object.keys(CAFE_CATEGORY_LABEL) as CafeCategory[];
const METHOD_LABEL: Record<Method, string> = { CASH: "Cash", CARD: "Card", TRANSFER: "Transfer" };
const CAFE_ROLES = ["Café manager", "Barista", "Server", "Kitchen"];

export default function CafePage() {
  const user = useUser();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, reload } = useApi<CafeData>("/api/cafe");
  const canManage = user.role === "OWNER" || user.role === "MANAGER";

  const locked = data ? !data.enabled : false;
  const items = data?.enabled ? data.items : DEMO_ITEMS;
  const today = data?.enabled ? data.today : DEMO_TODAY;
  const recent = data?.enabled ? data.recent : DEMO_SALES;
  const team = data?.enabled ? data.team : DEMO_TEAM;

  const [upsell, setUpsell] = useState(false);
  const [category, setCategory] = useState<"ALL" | CafeCategory>("ALL");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<Method>("CARD");
  const [member, setMember] = useState<MemberHit | null>(null);
  const [charging, setCharging] = useState(false);
  const [editing, setEditing] = useState<CafeItemView | "new" | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);

  /** In the preview, every action opens the upgrade pop-up instead. */
  const guard = (fn: () => void) => () => (locked ? setUpsell(true) : fn());

  const shown = useMemo(() => (category === "ALL" ? items : items.filter((i) => i.category === category)), [items, category]);
  const usedCategories = CATEGORIES.filter((c) => items.some((i) => i.category === c));
  const total = cart.reduce((a, l) => a + l.item.price * l.qty, 0);

  const add = (it: CafeItemView) => {
    if (!it.active) return toast("error", `${it.name} is switched off on the menu`);
    const inCart = cart.find((l) => l.item.id === it.id)?.qty ?? 0;
    if (it.stock != null && inCart >= it.stock) return toast("error", it.stock === 0 ? `${it.name} is sold out` : `Only ${it.stock} ${it.name} left`);
    setCart((c) => (c.some((l) => l.item.id === it.id) ? c.map((l) => (l.item.id === it.id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { item: it, qty: 1 }]));
  };
  const change = (id: string, d: number) =>
    setCart((c) => c.map((l) => (l.item.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const charge = async () => {
    if (!cart.length) return;
    setCharging(true);
    try {
      await api.post("/api/cafe/sales", { items: cart.map((l) => ({ itemId: l.item.id, qty: l.qty })), method, memberId: member?.id ?? null });
      toast("success", `Charged ${formatQAR(total)} by ${METHOD_LABEL[method].toLowerCase()}`);
      setCart([]);
      setMember(null);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Couldn't save the sale");
    } finally {
      setCharging(false);
    }
  };

  const voidSale = async (s: CafeSaleView) => {
    const ok = await confirm({ title: "Void this sale?", message: `${formatQAR(s.total)} will be removed from today's takings and any stock goes back.`, confirmLabel: "Void sale", danger: true });
    if (!ok) return;
    try {
      await api.del(`/api/cafe/sales/${s.id}`);
      toast("success", "Sale voided");
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            Café
            {locked && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                <LuLock className="h-3 w-3" /> Preview
              </span>
            )}
          </span>
        }
        subtitle={locked ? "This is how VOXI Café runs your gym café. Unlock it to use your own menu." : "Your menu, counter sales and café team"}
        actions={
          canManage && (
            <>
              <Button variant="secondary" onClick={guard(() => setTeamOpen(true))}>
                <LuUsers className="h-4 w-4" /> Café team
              </Button>
              <Button onClick={guard(() => (items.length >= MAX_CAFE_ITEMS ? toast("error", `The menu holds up to ${MAX_CAFE_ITEMS} items`) : setEditing("new")))}>
                <LuPlus className="h-4 w-4" /> Add item
              </Button>
            </>
          )
        }
      />

      {locked && <LockedBanner canManage={canManage} onMore={() => setUpsell(true)} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard accent label="Today's café sales" value={formatQAR(today.total)} icon={<LuCoffee className="h-4 w-4" />} hint={locked ? "Sample figures" : undefined} />
        <StatCard label="Orders today" value={today.sales.toLocaleString("en")} icon={<LuReceipt className="h-4 w-4" />} />
        <StatCard label="Cash" value={formatQAR(today.cash)} icon={<LuBanknote className="h-4 w-4" />} />
        <StatCard label="Card and transfer" value={formatQAR(today.card + today.transfer)} icon={<LuCreditCard className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Menu */}
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">Menu</h2>
              <p className="text-xs text-muted">
                {items.length} of {MAX_CAFE_ITEMS} items · tap an item to add it to the order
              </p>
            </div>
            {usedCategories.length > 1 && (
              <Segmented
                value={category}
                onChange={setCategory}
                options={[{ value: "ALL" as const, label: "All" }, ...usedCategories.map((c) => ({ value: c, label: CAFE_CATEGORY_LABEL[c] }))]}
              />
            )}
          </div>

          {items.length === 0 ? (
            <EmptyState icon={LuCoffee} title="Your menu is empty" message={`Add up to ${MAX_CAFE_ITEMS} items: coffees, shakes, snacks and meals.`} action={canManage ? <Button onClick={() => setEditing("new")}><LuPlus className="h-4 w-4" /> Add the first item</Button> : undefined} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {shown.map((it) => {
                const inCart = cart.find((l) => l.item.id === it.id)?.qty ?? 0;
                const soldOut = it.stock === 0;
                return (
                  <div
                    key={it.id}
                    className={cn(
                      "group relative rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md",
                      inCart > 0 && "border-brand-400 ring-2 ring-brand-500/15",
                      (!it.active || soldOut) && "opacity-55",
                    )}
                  >
                    <button type="button" onClick={guard(() => add(it))} className="absolute inset-0 rounded-2xl" aria-label={`Add ${it.name} to the order`} />
                    <div className="pointer-events-none flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{CAFE_CATEGORY_LABEL[it.category]}</p>
                        <p className="mt-0.5 font-semibold leading-snug text-ink">{it.name}</p>
                      </div>
                      <p className="shrink-0 font-semibold text-ink tabular-nums">QAR {it.price}</p>
                    </div>
                    <div className="pointer-events-none mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {it.calories != null && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-muted">{it.calories} kcal</span>}
                      {it.protein != null && <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{it.protein} g protein</span>}
                      {!it.active ? (
                        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium text-muted">Off menu</span>
                      ) : it.stock != null ? (
                        <span className={cn("rounded-md px-1.5 py-0.5 font-medium", soldOut ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" : it.stock <= 5 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : "bg-surface-2 text-muted")}>
                          {soldOut ? "Sold out" : `${it.stock} left`}
                        </span>
                      ) : null}
                    </div>
                    {inCart > 0 && (
                      <span className="pointer-events-none absolute -top-2 -left-2 grid h-6 min-w-6 place-items-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white shadow">{inCart}</span>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={guard(() => setEditing(it))}
                        aria-label={`Edit ${it.name}`}
                        className="absolute right-2 bottom-2 z-10 rounded-lg p-1.5 text-muted opacity-0 transition group-hover:opacity-100 hover:bg-surface-2 hover:text-ink focus:opacity-100"
                      >
                        <LuPencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Counter */}
        <Card className="p-5 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Order</h2>
            {cart.length > 0 && (
              <button type="button" onClick={() => setCart([])} className="text-xs font-medium text-muted hover:text-ink">
                Clear
              </button>
            )}
          </div>
          {cart.length === 0 ? (
            <div className="mt-6 mb-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
              <LuCoffee className="mx-auto h-6 w-6 text-muted/60" />
              <p className="mt-2 text-sm text-muted">Tap menu items to build an order</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {cart.map((l) => (
                <li key={l.item.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{l.item.name}</p>
                    <p className="text-xs text-muted tabular-nums">QAR {l.item.price} each</p>
                  </div>
                  <div className="flex items-center rounded-lg border border-line">
                    <button type="button" onClick={() => change(l.item.id, -1)} className="p-1.5 text-muted hover:text-ink" aria-label="One less">
                      <LuMinus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                    <button type="button" onClick={guard(() => add(l.item))} className="p-1.5 text-muted hover:text-ink" aria-label="One more">
                      <LuPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="w-16 text-right text-sm font-semibold text-ink tabular-nums">{l.item.price * l.qty}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 space-y-4 border-t border-line pt-4">
            <MemberPicker value={member} onChange={setMember} disabled={locked} onLocked={() => setUpsell(true)} />
            <div>
              <p className="label">Payment</p>
              <Segmented value={method} onChange={setMethod} options={(Object.keys(METHOD_LABEL) as Method[]).map((m) => ({ value: m, label: METHOD_LABEL[m] }))} className="w-full [&>button]:flex-1 [&>button]:justify-center" />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted">Total</span>
              <span className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">{formatQAR(total)}</span>
            </div>
            <Button className="w-full" size="lg" loading={charging} disabled={!locked && cart.length === 0} onClick={guard(charge)}>
              {locked ? <LuLock className="h-4 w-4" /> : <LuCheck className="h-4 w-4" />}
              {cart.length ? `Charge ${formatQAR(total)}` : "Charge"}
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Best sellers today" subtitle={locked ? "Sample figures" : undefined} />
          {today.top.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No sales yet today.</p>
          ) : (
            <ul className="space-y-3 px-5 pb-5">
              {today.top.map((t, i) => {
                const max = today.top[0]!.qty || 1;
                return (
                  <li key={t.name}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-ink">
                        <span className="mr-2 text-muted tabular-nums">{i + 1}</span>
                        {t.name}
                      </span>
                      <span className="shrink-0 text-muted tabular-nums">{t.qty} sold</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full brand-gradient" style={{ width: `${(t.qty / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent orders" />
          {recent.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">Orders you ring up appear here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.slice(0, 8).map((s) => (
                <li key={s.id} className="group flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{s.items.map((l) => (l.qty > 1 ? `${l.qty} × ${l.name}` : l.name)).join(", ")}</p>
                    <p className="text-xs text-muted">
                      {timeAgo(s.createdAt)} · {METHOD_LABEL[s.method]}
                      {s.member ? ` · ${s.member.firstName} ${s.member.lastName}` : ""}
                      {s.soldBy ? ` · by ${s.soldBy.name}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink tabular-nums">{formatQAR(s.total)}</span>
                  {canManage && !locked && (
                    <button type="button" onClick={() => voidSale(s)} aria-label="Void sale" className="rounded-md p-1 text-muted opacity-0 transition group-hover:opacity-100 hover:text-rose-600 focus:opacity-100">
                      <LuX className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Café team"
            action={
              canManage && (
                <Button size="sm" variant="ghost" onClick={guard(() => setTeamOpen(true))}>
                  Manage
                </Button>
              )
            }
          />
          {team.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">Nobody yet. {canManage ? "Use Manage to add people from your staff." : ""}</p>
          ) : (
            <ul className="space-y-3 px-5 pb-5">
              {team.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <Avatar name={t.name} size={34} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                    <p className="text-xs text-muted">{t.cafeRole}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ItemModal
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      {data?.enabled && <TeamModal open={teamOpen} staff={data.staff} onClose={() => setTeamOpen(false)} onSaved={reload} />}
      <UpsellModal open={upsell} canManage={canManage} onClose={() => setUpsell(false)} />
    </>
  );
}

/** Big banner at the top of the preview. */
function LockedBanner({ canManage, onMore }: { canManage: boolean; onMore: () => void }) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl bg-[#120b2b] p-6 text-white sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_90%_0%,rgba(124,92,255,0.5),transparent_70%)]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">
            <LuSparkles className="h-3.5 w-3.5" /> VOXI Café add-on
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Run your gym café from VOXI</h2>
          <p className="mt-1.5 text-sm text-white/70">
            Everything below is a sample. Unlock VOXI Café for {formatQAR(CAFE_PRICE_YEAR)} a year to sell from your own menu, track stock and see your takings.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canManage ? (
            <Link href="/billing?addon=cafe" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#1a1033] transition hover:bg-white/90">
              <LuLock className="h-4 w-4" /> Unlock VOXI Café
            </Link>
          ) : (
            <span className="text-sm text-white/70">Ask your gym owner to unlock it.</span>
          )}
          <button type="button" onClick={onMore} className="h-11 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10">
            What's included
          </button>
        </div>
      </div>
    </div>
  );
}

function UpsellModal({ open, canManage, onClose }: { open: boolean; canManage: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unlock VOXI Café"
      description="This is a preview with sample data. Add VOXI Café to your plan to use it with your own menu."
      footer={
        canManage ? (
          <Link href="/billing?addon=cafe" className="inline-flex h-10 items-center gap-2 rounded-xl brand-gradient px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
            <LuLock className="h-4 w-4" /> Add VOXI Café to my plan
          </Link>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            OK
          </Button>
        )
      }
    >
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
        <p className="flex items-end gap-1.5">
          <span className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">{formatQAR(CAFE_PRICE_YEAR)}</span>
          <span className="mb-1 text-sm text-muted">a year, on top of your plan</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">Shorter plans pay the same rate for their term.</p>
      </div>
      <ul className="mt-4 space-y-2.5">
        {CAFE_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-ink-soft">
            <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}
          </li>
        ))}
      </ul>
      {!canManage && <p className="mt-4 text-sm text-muted">Only the gym owner or a manager can add it. Let them know you'd like it.</p>}
    </Modal>
  );
}

function MemberPicker({ value, onChange, disabled, onLocked }: { value: MemberHit | null; onChange: (m: MemberHit | null) => void; disabled: boolean; onLocked: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);

  useEffect(() => {
    if (disabled || q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<{ results: MemberHit[] }>(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setHits(r.results.slice(0, 5)))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, disabled]);

  if (value) {
    return (
      <div>
        <p className="label">Member</p>
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-sm">
          <span className="font-medium text-ink">
            {value.firstName} {value.lastName} <span className="text-muted">{value.code}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} aria-label="Remove member" className="text-muted hover:text-ink">
            <LuX className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="relative">
      <p className="label">Member (optional)</p>
      <div className="relative">
        <LuSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Search by name or code"
          value={q}
          onFocus={() => disabled && onLocked()}
          readOnly={disabled}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {hits.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(h);
                  setQ("");
                  setHits([]);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="font-medium text-ink">
                  {h.firstName} {h.lastName}
                </span>
                <span className="text-xs text-muted">{h.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const blankItem = { name: "", category: "COFFEE" as CafeCategory, price: "", calories: "", protein: "", stock: "", trackStock: false, active: true };

function ItemModal({ item, onClose, onSaved }: { item: CafeItemView | "new" | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [f, setF] = useState(blankItem);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const editing = item && item !== "new" ? item : null;

  useEffect(() => {
    setErrors({});
    if (item === "new") setF(blankItem);
    else if (item)
      setF({
        name: item.name,
        category: item.category,
        price: String(item.price),
        calories: item.calories != null ? String(item.calories) : "",
        protein: item.protein != null ? String(item.protein) : "",
        stock: item.stock != null ? String(item.stock) : "",
        trackStock: item.stock != null,
        active: item.active,
      });
  }, [item]);

  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = {
      name: f.name,
      category: f.category,
      price: f.price,
      calories: f.calories === "" ? null : f.calories,
      protein: f.protein === "" ? null : f.protein,
      stock: f.trackStock ? (f.stock === "" ? 0 : f.stock) : null,
      active: f.active,
    };
    try {
      if (editing) await api.put(`/api/cafe/items/${editing.id}`, body);
      else await api.post("/api/cafe/items", body);
      toast("success", editing ? "Item updated" : `${f.name} added to the menu`);
      onSaved();
    } catch (e) {
      setErrors(fieldErrors(e));
      toast("error", e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    const ok = await confirm({ title: `Remove ${editing.name}?`, message: "It comes off the menu. Past sales keep their history.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    try {
      await api.del(`/api/cafe/items/${editing.id}`);
      toast("success", "Removed from the menu");
      onSaved();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={editing ? "Edit menu item" : "Add menu item"}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {editing ? (
            <Button variant="ghost" onClick={remove} className="text-rose-600">
              <LuTrash2 className="h-4 w-4" /> Remove
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} loading={busy}>
            {editing ? "Save" : "Add to menu"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name} className="sm:col-span-2">
          <Input value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Whey Protein Shake" autoFocus />
        </Field>
        <Field label="Category" required error={errors.category}>
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as CafeCategory })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CAFE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Price (QAR)" required error={errors.price}>
          <Input type="number" inputMode="numeric" min={1} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Calories" hint="Optional" error={errors.calories}>
          <Input type="number" inputMode="numeric" min={0} value={f.calories} onChange={(e) => setF({ ...f, calories: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Protein (g)" hint="Optional" error={errors.protein}>
          <Input type="number" inputMode="numeric" min={0} value={f.protein} onChange={(e) => setF({ ...f, protein: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <div className="sm:col-span-2 space-y-3 rounded-xl border border-line p-3">
          <Toggle checked={f.trackStock} onChange={(v) => setF({ ...f, trackStock: v })} label="Track stock (counts down with every sale)" />
          {f.trackStock && (
            <Field label="Units in stock" error={errors.stock}>
              <Input type="number" inputMode="numeric" min={0} value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, "") })} />
            </Field>
          )}
          <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="On the menu" />
        </div>
      </div>
    </Modal>
  );
}

function TeamModal({ open, staff, onClose, onSaved }: { open: boolean; staff: CafeTeamView[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const setRole = async (s: CafeTeamView, cafeRole: string) => {
    setBusyId(s.id);
    try {
      await api.put(`/api/cafe/team/${s.id}`, { cafeRole: cafeRole || null });
      toast("success", cafeRole ? `${s.name}: ${cafeRole}` : `${s.name} taken off the café team`);
      onSaved();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Café team" description="Choose who works in the café and their job there. Add new people on the Staff page first.">
      {staff.length === 0 ? (
        <p className="text-sm text-muted">No staff yet. Add your team on the Staff page.</p>
      ) : (
        <ul className="divide-y divide-line">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={s.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                <p className="text-xs text-muted capitalize">{s.role.toLowerCase()}</p>
              </div>
              <Select value={s.cafeRole ?? ""} disabled={busyId === s.id} onChange={(e) => setRole(s, e.target.value)} className="w-40">
                <option value="">Not in the café</option>
                {[...new Set([...CAFE_ROLES, ...(s.cafeRole ? [s.cafeRole] : [])])].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </li>
          ))}
        </ul>
      )}
      {staff.some((s) => s.cafeRole) && (
        <p className="mt-3 text-xs text-muted">
          <Badge tone="brand">Tip</Badge> Café staff who sign in to VOXI need the Reception role or higher to ring up orders.
        </p>
      )}
    </Modal>
  );
}
