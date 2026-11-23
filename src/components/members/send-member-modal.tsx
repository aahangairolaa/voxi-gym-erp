"use client";
/**
 * Send a member a message with their membership card, invoices and any files,
 * by WhatsApp or email — from their profile.
 *
 * WhatsApp without the Business API (free): WhatsApp opens with the text and
 * links to the card / invoice ready; on a phone, "Share files" hands the PDFs
 * themselves to WhatsApp. With the Business API the files are sent from VOXI.
 * Email (free): sent by VOXI with the files attached, replies go to the gym.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronRight, LuDownload, LuFileText, LuIdCard, LuMail, LuMessageCircle, LuPaperclip, LuShare2, LuX, LuZap } from "react-icons/lu";
import { useUser } from "@/components/layout/session-context";
import { useWhatsApp } from "@/components/whatsapp/use-whatsapp";
import { Button, Field, Input, Modal, Segmented, Textarea, useToast } from "@/components/ui";
import { invalidate } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { MEMBER_STATUS } from "@/lib/constants";
import { QUICK_TYPES } from "@/lib/whatsapp-templates";
import { formatDate, formatQAR } from "@/lib/format";
import type { InvoiceData } from "@/lib/docs/invoice-model";
import { blobToBase64, cardPdf, downloadBlob, invoicePdf } from "@/lib/docs/render";
import type { MemberDetail, MessageType } from "@/types/api";
import { cn } from "@/lib/utils";

export type SendPreset = { kind: "welcome" } | { kind: "invoice"; paymentId: string } | { kind: "custom" };
type Channel = "WHATSAPP" | "EMAIL" | "QUICK";
const MAX_BYTES = 3_000_000;
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function initialText(preset: SendPreset, m: MemberDetail, gym: string, invoiceNo?: string) {
  if (preset.kind === "welcome")
    return `Hi ${m.firstName}, welcome to ${gym}! 🎉\n\nHere is your membership card. Save it on your phone and show the QR code at reception to check in.\n\nSee you at the gym!`;
  if (preset.kind === "invoice") return `Hi ${m.firstName}, thank you for your payment. Here is your invoice${invoiceNo ? ` ${invoiceNo}` : ""}.\n\n${gym}`;
  return `Hi ${m.firstName}, `;
}

export function SendMemberModal({ open, onClose, member: m, preset }: { open: boolean; onClose: () => void; member: MemberDetail; preset: SendPreset }) {
  const user = useUser();
  const toast = useToast();
  const sendWa = useWhatsApp();
  const gymName = user.gym?.name ?? "our gym";
  const apiMode = !!user.gym?.whatsappEnabled;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [card, setCard] = useState(false);
  const [invoiceIds, setInvoiceIds] = useState<string[]>([]);
  const [extra, setExtra] = useState<File[]>([]);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [built, setBuilt] = useState<{ key: string; files: File[]; links: string[] } | null>(null);
  const [building, setBuilding] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const invoices = useRef(new Map<string, InvoiceData>());

  // Start fresh each time it opens
  useEffect(() => {
    if (!open) return;
    const latest = m.payments.find((p) => p.status === "PAID");
    const inv = preset.kind === "invoice" ? m.payments.find((p) => p.id === preset.paymentId) : undefined;
    setChannel("WHATSAPP");
    setCard(preset.kind === "welcome");
    setInvoiceIds(preset.kind === "invoice" ? [preset.paymentId] : preset.kind === "welcome" && latest ? [latest.id] : []);
    setExtra([]);
    setSubject(preset.kind === "welcome" ? `Welcome to ${gymName}` : preset.kind === "invoice" ? `Your invoice${inv ? ` ${inv.invoiceNo}` : ""} from ${gymName}` : `A message from ${gymName}`);
    setText(initialText(preset, m, gymName, inv?.invoiceNo));
    setBuilt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const key = `${card}|${invoiceIds.join(",")}|${extra.map((f) => f.name + f.size).join(",")}`;

  // Make the PDFs as soon as the choice changes, so Share works straight from the click.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBuilding(true);
    (async () => {
      const files: File[] = [];
      const links: string[] = [];
      if (card) {
        const cur = m.currentMembership;
        const blob = await cardPdf({
          gym: { name: user.gym?.name ?? "VOXI", logo: user.gym?.logo ?? null, brandColor: user.gym?.brandColor ?? null },
          name: m.name,
          code: m.code,
          photoUrl: m.photoUrl,
          qrValue: `${origin}/c/${m.qrToken}`,
          membership: cur
            ? { plan: cur.plan.name, endDate: cur.endDate, ok: cur.effectiveStatus === "ACTIVE" || cur.effectiveStatus === "EXPIRING", statusLabel: MEMBER_STATUS[cur.effectiveStatus].label }
            : null,
        });
        files.push(new File([blob], `${m.name} - membership card.pdf`, { type: "application/pdf" }));
        links.push(`Your membership card: ${origin}/c/${m.qrToken}`);
      }
      for (const id of invoiceIds) {
        let data = invoices.current.get(id);
        if (!data) {
          data = await api.get<InvoiceData>(`/api/payments/${id}`);
          invoices.current.set(id, data);
        }
        files.push(new File([await invoicePdf(data)], `${data.payment.invoiceNo}.pdf`, { type: "application/pdf" }));
        if (data.shareToken) links.push(`Invoice ${data.payment.invoiceNo}: ${origin}/r/${data.shareToken}`);
      }
      files.push(...extra);
      if (!cancelled) setBuilt({ key, files, links });
    })()
      .catch((e) => !cancelled && toast("error", e instanceof Error ? e.message : "Couldn't prepare the files"))
      .finally(() => !cancelled && setBuilding(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const ready = built?.key === key ? built : null;
  const totalBytes = ready?.files.reduce((a, f) => a + f.size, 0) ?? 0;
  const tooBig = totalBytes > MAX_BYTES;
  const canShareFiles = useMemo(() => {
    if (typeof navigator === "undefined" || !navigator.canShare || !ready?.files.length) return false;
    try {
      return navigator.canShare({ files: ready.files });
    } catch {
      return false;
    }
  }, [ready]);

  const waText = () => [text.trim(), ...(ready?.links.length ? ["", ...ready.links] : [])].join("\n").trim();

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const bad = picked.find((f) => !FILE_TYPES.includes(f.type));
    if (bad) toast("error", `${bad.name}: only PDF and image files (JPG, PNG, WebP) can be attached.`);
    setExtra((cur) => [...cur, ...picked.filter((f) => FILE_TYPES.includes(f.type))].slice(0, 4));
    if (fileInput.current) fileInput.current.value = "";
  };

  const postToServer = async (ch: "WHATSAPP" | "EMAIL") => {
    if (!ready) return;
    const attachments = await Promise.all(ready.files.map(async (f) => ({ name: f.name, type: f.type, data: await blobToBase64(f) })));
    const r = await api.post<{ to: string }>(`/api/members/${m.id}/send`, { channel: ch, subject: ch === "EMAIL" ? subject : null, text, attachments });
    invalidate("/api/whatsapp/messages");
    invalidate(`/api/members/${m.id}`);
    toast("success", ch === "EMAIL" ? `Email sent to ${r.to}` : "WhatsApp message sent");
    onClose();
  };

  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(what);
    try {
      await fn();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast("error", e instanceof Error ? e.message : "Sending failed");
    } finally {
      setBusy(null);
    }
  };

  const openChat = () =>
    run("chat", async () => {
      const r = await sendWa(m.id, "CUSTOM", { text: waText() });
      if (r) onClose();
    });

  const shareFiles = () =>
    run("share", async () => {
      if (!ready) return;
      await navigator.share({ files: ready.files, text: text.trim() });
      // Log it like any other WhatsApp message (no need to open a chat)
      await api.post("/api/whatsapp/send", { memberId: m.id, type: "CUSTOM", text: `${text.trim()}\n[shared ${ready.files.map((f) => f.name).join(", ")}]` }).catch(() => {});
      invalidate("/api/whatsapp/messages");
      onClose();
    });

  const quick = (type: MessageType) =>
    run(type, async () => {
      const r = await sendWa(m.id, type);
      if (r) onClose();
    });

  const downloadAll = () => ready?.files.forEach((f) => downloadBlob(f, f.name));

  const toggleInvoice = (id: string) => setInvoiceIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const noEmail = channel === "EMAIL" && !m.email;
  const description = channel === "EMAIL" ? m.email ?? "No email address on file" : m.phone;
  const blocked = !ready || building || tooBig;

  const footer =
    channel === "QUICK" ? null : channel === "EMAIL" ? (
      <Button onClick={() => run("email", () => postToServer("EMAIL"))} loading={busy === "email"} disabled={blocked || noEmail || !text.trim()}>
        <LuMail className="h-4 w-4" /> Send email
      </Button>
    ) : apiMode ? (
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={openChat} loading={busy === "chat"} disabled={blocked}>
          Open chat instead
        </Button>
        <Button onClick={() => run("api", () => postToServer("WHATSAPP"))} loading={busy === "api"} disabled={blocked || (!text.trim() && !ready?.files.length)}>
          <LuMessageCircle className="h-4 w-4" /> Send on WhatsApp
        </Button>
      </div>
    ) : (
      <div className="flex flex-wrap justify-end gap-2">
        {!!ready?.files.length &&
          (canShareFiles ? (
            <Button variant="secondary" onClick={shareFiles} loading={busy === "share"} disabled={blocked}>
              <LuShare2 className="h-4 w-4" /> Share files
            </Button>
          ) : (
            <Button variant="secondary" onClick={downloadAll} disabled={blocked}>
              <LuDownload className="h-4 w-4" /> Download files
            </Button>
          ))}
        <Button onClick={openChat} loading={busy === "chat"} disabled={blocked || !waText()}>
          <LuMessageCircle className="h-4 w-4" /> Open WhatsApp
        </Button>
      </div>
    );

  const Pick = ({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        on ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-line hover:bg-surface-2",
      )}
    >
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", on ? "bg-brand-600 text-white" : "bg-surface-2 text-muted")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted">{sub}</span>
      </span>
      <span className={cn("h-4 w-4 shrink-0 rounded border", on ? "border-brand-600 bg-brand-600" : "border-line-strong")} />
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Send to ${m.name}`} description={description} footer={footer ?? undefined}>
      <div className="space-y-4">
        <Segmented<Channel>
          value={channel}
          onChange={setChannel}
          options={[
            { value: "WHATSAPP", label: <><LuMessageCircle className="h-3.5 w-3.5" /> WhatsApp</> },
            { value: "EMAIL", label: <><LuMail className="h-3.5 w-3.5" /> Email</> },
            { value: "QUICK", label: <><LuZap className="h-3.5 w-3.5" /> Quick texts</> },
          ]}
        />
        {channel === "QUICK" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">One tap sends a ready-made WhatsApp message (edit the wording in Settings → WhatsApp).</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUICK_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => quick(t.type)}
                  disabled={!!busy}
                  className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-brand-400 hover:bg-surface-2 disabled:opacity-60"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                    <LuMessageCircle className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t.label}</span>
                    <span className="block text-xs text-muted">{t.description}</span>
                  </span>
                  {busy === t.type ? <span className="text-xs text-muted">Sending…</span> : <LuChevronRight className="h-4 w-4 text-muted" />}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
        {noEmail && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{m.firstName} has no email address. Add one with Edit on their profile, or send on WhatsApp.</p>}

        {channel === "EMAIL" && (
          <Field label="Subject">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
          </Field>
        )}
        <Field label="Message">
          <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} />
        </Field>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Attach</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Pick on={card} onClick={() => setCard(!card)} icon={<LuIdCard className="h-4 w-4" />} title="Membership card" sub="PDF with their check-in QR code" />
            {m.payments.slice(0, 5).map((p) => (
              <Pick
                key={p.id}
                on={invoiceIds.includes(p.id)}
                onClick={() => toggleInvoice(p.id)}
                icon={<LuFileText className="h-4 w-4" />}
                title={`Invoice ${p.invoiceNo}`}
                sub={`${formatQAR(p.amount)} · ${formatDate(p.paidAt)}${p.status === "REFUNDED" ? " · refunded" : ""}`}
              />
            ))}
          </div>
          {extra.length > 0 && (
            <ul className="mt-2 space-y-1">
              {extra.map((f, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs">
                  <LuPaperclip className="h-3.5 w-3.5 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-muted">{Math.ceil(f.size / 1024)} KB</span>
                  <button type="button" onClick={() => setExtra(extra.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="text-muted hover:text-rose-600">
                    <LuX className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input ref={fileInput} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => fileInput.current?.click()} disabled={extra.length >= 4}>
            <LuPaperclip className="h-4 w-4" /> Add photo or PDF
          </Button>
          <p className={cn("mt-1 text-xs", tooBig ? "text-rose-600" : "text-muted")}>
            {building ? "Preparing files…" : ready?.files.length ? `${ready.files.length} file${ready.files.length === 1 ? "" : "s"}, ${(totalBytes / 1_000_000).toFixed(1)} MB${tooBig ? ", too big (3 MB at most). Remove a file." : ""}` : "No files attached"}
          </p>
        </div>

        {channel === "WHATSAPP" && !apiMode && (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
            WhatsApp opens with your message ready{ready?.links.length ? ", with links to the card and invoice the member can open and download" : ""}.
            {ready?.files.length
              ? canShareFiles
                ? " To send the PDFs themselves, tap Share files and pick WhatsApp and the member."
                : " To send the files themselves, download them and drop them into the chat, or send by email."
              : ""}{" "}
            Connect the WhatsApp Business API in Settings to send files straight from VOXI.
          </p>
        )}
        {channel === "EMAIL" && <p className="text-xs text-muted">Sent as &ldquo;{gymName} via VOXI&rdquo;. If the member replies, it goes to your gym&apos;s email in Settings.</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
