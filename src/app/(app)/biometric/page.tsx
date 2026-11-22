"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LuCopy, LuFingerprint, LuKey, LuPencil, LuPlus, LuScanFace, LuCreditCard, LuHand, LuTrash2, LuWifi, LuWifiOff, LuRefreshCw,
  LuShieldCheck, LuActivity, LuUserCheck,
} from "react-icons/lu";
import { MemberPicker } from "@/components/members/member-picker";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, StatCard, Toggle,
  useConfirm, useToast,
} from "@/components/ui";
import { invalidate, useApi } from "@/hooks/use-api";
import { useBranches } from "@/hooks/use-lookups";
import { api } from "@/lib/api-client";
import { formatDate, formatTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BiometricEvent, Device, SearchResult } from "@/types/api";

const TYPE_ICON = { FINGERPRINT: LuFingerprint, FACE: LuScanFace, CARD: LuCreditCard, PALM: LuHand };
const RESULT: Record<BiometricEvent["result"], { label: string; tone: "green" | "blue" | "red" | "amber" }> = {
  GRANTED_IN: { label: "Checked in", tone: "green" },
  GRANTED_OUT: { label: "Checked out", tone: "blue" },
  DENIED: { label: "Denied", tone: "red" },
  UNKNOWN_USER: { label: "Unknown ID", tone: "amber" },
};
const blankDevice = { name: "", type: "FINGERPRINT" as Device["type"], vendor: "", serialNumber: "", branchId: "", isActive: true };

function CopyBox({ text, label }: { text: string; label?: string }) {
  const toast = useToast();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/60 p-2 pl-3 dark:border-brand-800 dark:bg-brand-500/10">
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-brand-800 dark:text-brand-200">{text}</code>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          navigator.clipboard?.writeText(text);
          toast("success", `${label ?? "Text"} copied`);
        }}
      >
        <LuCopy className="h-3.5 w-3.5" /> Copy
      </Button>
    </div>
  );
}

export default function BiometricPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const branches = useBranches();
  const devices = useApi<{ devices: Device[] }>("/api/biometric/devices", { refreshMs: 30_000 });
  const events = useApi<{ events: BiometricEvent[] }>("/api/biometric/events?limit=60", { refreshMs: 5_000 });
  const enrollments = useApi<{ enrolled: { id: string; code: string; name: string; biometricId: string; biometricEnrolled: string | null }[]; totalMembers: number }>(
    "/api/biometric/enrollments",
  );
  const [editing, setEditing] = useState<Device | "new" | null>(null);
  const [form, setForm] = useState(blankDevice);
  const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [guide, setGuide] = useState<"webhook" | "zkteco">("webhook");
  const [linkMember, setLinkMember] = useState<SearchResult | null>(null);
  const [linkId, setLinkId] = useState("");
  const [origin, setOrigin] = useState("https://your-voxi-domain.com");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (editing === "new") setForm(blankDevice);
    else if (editing) setForm({ ...editing, vendor: editing.vendor ?? "", branchId: editing.branchId ?? "" });
  }, [editing]);

  const saveDevice = async () => {
    setSaving(true);
    try {
      const body = { ...form, vendor: form.vendor || null, branchId: form.branchId || null };
      if (editing === "new") {
        const r = await api.post<{ apiKey: string; device: { name: string } }>("/api/biometric/devices", body);
        setNewKey({ name: r.device.name, key: r.apiKey });
      } else if (editing) {
        await api.put(`/api/biometric/devices/${editing.id}`, body);
        toast("success", "Device updated");
      }
      setEditing(null);
      devices.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const rotate = async (d: Device) => {
    if (!(await confirm({ title: `New key for ${d.name}?`, message: "The current key stops working immediately. You'll need to update the device or bridge.", confirmLabel: "Generate new key" }))) return;
    const r = await api.post<{ apiKey: string }>(`/api/biometric/devices/${d.id}/rotate-key`);
    setNewKey({ name: d.name, key: r.apiKey });
    devices.reload();
  };

  const removeDevice = async (d: Device) => {
    if (!(await confirm({ title: `Remove ${d.name}?`, message: "Its scan history will be deleted too.", danger: true, confirmLabel: "Remove device" }))) return;
    await api.del(`/api/biometric/devices/${d.id}`);
    toast("success", "Device removed");
    devices.reload();
  };

  const link = async () => {
    if (!linkMember || !linkId.trim()) return;
    try {
      await api.post("/api/biometric/enrollments", { memberId: linkMember.id, biometricId: linkId.trim() });
      toast("success", `${linkMember.name} linked to ID ${linkId.trim()}`);
      setLinkMember(null);
      setLinkId("");
      invalidate("/api/members");
      enrollments.reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const list = devices.data?.devices ?? [];
  const evs = events.data?.events ?? [];
  const enrolled = enrollments.data?.enrolled.length ?? 0;
  const total = enrollments.data?.totalMembers ?? 0;
  const deniedToday = evs.filter((e) => (e.result === "DENIED" || e.result === "UNKNOWN_USER") && Date.now() - +new Date(e.scannedAt) < 86_400_000).length;

  return (
    <>
      <PageHeader
        title="Biometric access"
        subtitle="Connect fingerprint, face or card readers. Scans check members in automatically"
        actions={
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" /> Add device
          </Button>
        }
      />

      <div className="stagger mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard accent label="Devices online" value={`${list.filter((d) => d.online).length}/${list.length}`} icon={<LuWifi className="h-[18px] w-[18px]" />} />
        <StatCard label="Scans (24h)" value={list.reduce((s, d) => s + d.scans24h, 0)} icon={<LuActivity className="h-[18px] w-[18px]" />} />
        <StatCard label="Members enrolled" value={`${enrolled}`} hint={total ? `${Math.round((enrolled / total) * 100)}% of ${total}` : undefined} icon={<LuUserCheck className="h-[18px] w-[18px]" />} />
        <StatCard label="Denied (24h)" value={deniedToday} icon={<LuShieldCheck className="h-[18px] w-[18px]" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* Devices */}
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((d) => {
              const Icon = TYPE_ICON[d.type];
              return (
                <Card key={d.id} hover className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white brand-gradient shadow-[0_8px_20px_-8px_rgba(106,68,242,0.8)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{d.name}</p>
                      <p className="truncate text-xs text-muted">{d.vendor ?? d.type} · {d.branch?.name ?? "No branch"}</p>
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", d.online ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-surface-2 text-muted")}>
                      {d.online ? <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-emerald-500" /> : <LuWifiOff className="h-3 w-3" />}
                      {d.online ? "Online" : d.isActive ? "Offline" : "Disabled"}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-muted">Serial</dt>
                      <dd className="truncate font-mono font-medium">{d.serialNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Last seen</dt>
                      <dd className="font-medium">{d.lastSeenAt ? timeAgo(d.lastSeenAt) : "Never"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Scans 24h</dt>
                      <dd className="font-medium tabular-nums">{d.scans24h}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
                      <LuKey className="h-3.5 w-3.5" /> ••••{d.apiKeyHint}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => rotate(d)} title="New API key">
                        <LuRefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(d)} title="Edit">
                        <LuPencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeDevice(d)} title="Remove" className="hover:text-rose-600">
                        <LuTrash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {devices.data && list.length === 0 && (
              <Card className="sm:col-span-2">
                <EmptyState icon={LuFingerprint} title="No devices yet" message="Register your turnstile or reader to start automatic check-ins." action={<Button onClick={() => setEditing("new")}>Add device</Button>} />
              </Card>
            )}
          </div>

          {/* Integration guide */}
          <Card>
            <CardHeader title="Connect your device" subtitle="Two ways to send scans to VOXI" action={<Segmented value={guide} onChange={setGuide} options={[{ value: "webhook", label: "Any device" }, { value: "zkteco", label: "ZKTeco" }]} />} />
            <div className="space-y-4 px-5 pb-5 text-sm text-ink-soft">
              {guide === "webhook" ? (
                <>
                  <p>
                    Your device (or a small bridge program on the reception PC) sends every scan to VOXI. VOXI checks the membership and answers <b>allowed: true/false</b>. Open the turnstile when it’s true.
                  </p>
                  <pre className="overflow-x-auto rounded-xl bg-[#14112a] p-4 text-[12px] leading-relaxed text-[#d9d2ff]">
{`POST ${origin}/api/biometric/scan
x-device-key: <device API key>
Content-Type: application/json

{ "biometricUserId": "1001" }

→ { "allowed": true, "action": "IN",
    "member": { "code": "M-1001", "name": "James Carter" } }`}
                  </pre>
                  <p className="text-xs text-muted">
                    Test without hardware: <code className="rounded bg-surface-2 px-1.5 py-0.5">npm run biometric:simulate -- 1001</code>
                  </p>
                </>
              ) : (
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Add the device here with its exact <b>serial number</b> (Menu → System Info on the terminal).</li>
                  <li>
                    On the terminal: <b>Comm. → Cloud Server Setting</b>. Server address: <code className="rounded bg-surface-2 px-1.5 py-0.5">{origin.replace(/^https?:\/\//, "")}</code>, port <b>443</b>, HTTPS <b>on</b>.
                  </li>
                  <li>Enroll each member’s finger/face on the terminal using their VOXI number (e.g. 1001 for M-1001) as the User ID.</li>
                  <li>Scans appear in the live feed within seconds. First scan of the day = check-in, next = check-out.</li>
                </ol>
              )}
            </div>
          </Card>

          {/* Enrollments */}
          <Card>
            <CardHeader title="Enrolled members" subtitle="Link a member to the user ID stored on the device" />
            <div className="flex flex-col gap-2 border-b border-line px-5 pb-4 sm:flex-row">
              <div className="flex-1">
                <MemberPicker value={linkMember} onChange={setLinkMember} />
              </div>
              <Input placeholder="Device user ID" value={linkId} onChange={(e) => setLinkId(e.target.value)} className="font-mono sm:w-40" />
              <Button onClick={link} disabled={!linkMember || !linkId.trim()}>
                Link
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Device ID</th>
                    <th>Linked</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.data?.enrolled.slice(0, 100).map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link href={`/members/${m.id}`} className="font-semibold hover:text-brand-600">
                          {m.name}
                        </Link>{" "}
                        <span className="font-mono text-[11px] text-muted">{m.code}</span>
                      </td>
                      <td className="font-mono">{m.biometricId}</td>
                      <td className="text-ink-soft">{formatDate(m.biometricEnrolled)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Live feed */}
        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader
            title="Live scans"
            subtitle="Updates every 5 seconds"
            icon={<span className="h-2.5 w-2.5 animate-pulse-ring rounded-full bg-emerald-500" />}
          />
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
            {evs.length === 0 && <EmptyState title="No scans yet" />}
            {evs.map((e) => (
              <li key={e.id} className="flex animate-fade-in items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2/60">
                {e.member ? <Avatar name={e.member.name} size={32} /> : <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-500/15">?</div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.member?.name ?? `ID ${e.biometricUserId}`}</p>
                  <p className="truncate text-[11px] text-muted">
                    {formatTime(e.scannedAt)} · {e.device}
                    {e.reason && e.result !== "GRANTED_IN" && e.result !== "GRANTED_OUT" ? ` · ${e.reason}` : ""}
                  </p>
                </div>
                <Badge tone={RESULT[e.result].tone}>{RESULT[e.result].label}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Register device" : "Edit device"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveDevice} loading={saving} disabled={!form.name || !form.serialNumber}>
              {editing === "new" ? "Register & get key" : "Save"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main entrance turnstile" />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Device["type"] })}>
              <option value="FINGERPRINT">Fingerprint</option>
              <option value="FACE">Face recognition</option>
              <option value="CARD">RFID card</option>
              <option value="PALM">Palm</option>
            </Select>
          </Field>
          <Field label="Brand / model">
            <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="ZKTeco SpeedFace-V5L" />
          </Field>
          <Field label="Serial number" required>
            <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Branch">
            <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">Not set</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Device enabled" />
          </div>
        </div>
      </Modal>

      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Device API key" description={newKey?.name} footer={<Button onClick={() => setNewKey(null)}>I’ve saved it</Button>}>
        <div className="space-y-3">
          <p className="text-sm text-muted">Copy this key into your device or bridge now. For security it is shown <b>only once</b>.</p>
          {newKey && <CopyBox text={newKey.key} label="API key" />}
        </div>
      </Modal>
    </>
  );
}
