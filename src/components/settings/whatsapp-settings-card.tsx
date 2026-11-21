"use client";
import { useEffect, useState } from "react";
import { LuCircleCheck, LuCopy, LuMessageCircle, LuSend } from "react-icons/lu";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Skeleton, Textarea, Toggle, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { MESSAGE_TYPES, PLACEHOLDERS } from "@/lib/whatsapp-templates";
import type { MessageType, TemplateConfig, WhatsAppConfig } from "@/types/api";

/**
 * Settings → WhatsApp.
 * Without keys VOXI opens WhatsApp with the message ready (works for every gym).
 * With Meta WhatsApp Business API keys it sends automatically and tracks delivery.
 */
export function WhatsAppSettingsCard() {
  const toast = useToast();
  const { data, reload } = useApi<WhatsAppConfig>("/api/whatsapp/config");
  const [enabled, setEnabled] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [templates, setTemplates] = useState<Record<MessageType, TemplateConfig> | null>(null);
  const [tplType, setTplType] = useState<MessageType>("RENEWAL_REMINDER");
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setPhoneNumberId(data.phoneNumberId ?? "");
    setBusinessAccountId(data.businessAccountId ?? "");
    setTemplates(data.templates);
    setAccessToken("");
    setAppSecret("");
  }, [data]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = data ? `${origin}${data.webhookPath}` : "";

  const save = async (extra: { accessToken?: string | null; appSecret?: string | null } = {}) => {
    setBusy("save");
    try {
      await api.put("/api/whatsapp/config", {
        enabled,
        phoneNumberId: phoneNumberId || null,
        businessAccountId: businessAccountId || null,
        accessToken: accessToken || undefined,
        appSecret: appSecret || undefined,
        templates,
        ...extra,
      });
      toast("success", "WhatsApp settings saved");
      reload();
      if (enabled !== data?.enabled) setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    try {
      await api.post("/api/whatsapp/test", { phone: testPhone });
      toast("success", "Test message sent — check WhatsApp");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast("success", "Copied");
  };

  const tpl = templates?.[tplType];
  const setTpl = (patch: Partial<TemplateConfig>) => templates && setTemplates({ ...templates, [tplType]: { ...templates[tplType], ...patch } });

  return (
    <Card id="whatsapp">
      <CardHeader
        title="WhatsApp"
        subtitle="Renewal reminders, cards, birthday wishes and receipts"
        icon={<LuMessageCircle className="h-[18px] w-[18px]" />}
        action={data && <Badge tone={data.mode === "api" ? "green" : "gray"} dot>{data.mode === "api" ? "Business API connected" : "WhatsApp links"}</Badge>}
      />
      {!data || !templates ? (
        <Skeleton className="m-5 h-64" />
      ) : (
        <div className="space-y-6 px-5 pb-5">
          <div className="rounded-2xl border border-line bg-surface-2/50 p-4 text-sm text-ink-soft">
            {data.mode === "api" ? (
              <p className="flex items-start gap-2">
                <LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Messages are sent automatically from your WhatsApp Business number, and you can “Remind all” from the dashboard. Delivered/read ticks appear in the WhatsApp log.
              </p>
            ) : (
              <p>
                <b className="text-ink">Working now, no setup needed:</b> when staff press “Remind”, WhatsApp opens with the message ready — they just press send. To send automatically, connect the
                WhatsApp Business (Cloud) API below.
              </p>
            )}
          </div>

          <section className="space-y-4">
            <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Business API (Meta)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number ID" hint="Meta → WhatsApp → API setup">
                <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value.trim())} className="font-mono" />
              </Field>
              <Field label="WhatsApp Business account ID" hint="Optional">
                <Input value={businessAccountId} onChange={(e) => setBusinessAccountId(e.target.value.trim())} className="font-mono" />
              </Field>
              <Field label="Permanent access token" hint={data.hasToken ? "Saved (encrypted). Leave empty to keep it." : "System-user token with whatsapp_business_messaging"}>
                <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder={data.hasToken ? "•••••••• saved" : "EAAG…"} autoComplete="off" />
              </Field>
              <Field label="App secret" hint={data.hasAppSecret ? "Saved (encrypted). Used to verify webhooks." : "Meta app → Settings → Basic. Verifies webhooks."}>
                <Input type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder={data.hasAppSecret ? "•••••••• saved" : ""} autoComplete="off" />
              </Field>
            </div>
            <div className="grid gap-3 rounded-2xl border border-dashed border-line p-4 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs text-muted">Webhook callback URL</p>
                <button onClick={() => copy(webhookUrl)} className="flex w-full items-center gap-2 truncate font-mono text-xs text-ink hover:text-brand-600">
                  <span className="truncate">{webhookUrl}</span> <LuCopy className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted">Verify token</p>
                <button onClick={() => copy(data.verifyToken)} className="flex items-center gap-2 font-mono text-xs text-ink hover:text-brand-600">
                  {data.verifyToken} <LuCopy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted sm:col-span-2">In Meta → WhatsApp → Configuration, paste these and subscribe to the “messages” field. Your site must be online (https) for Meta to reach it.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Toggle checked={enabled} onChange={setEnabled} label="Send automatically with the Business API" />
              <div className="flex gap-2">
                {data.hasToken && (
                  <Button variant="ghost" size="sm" onClick={() => save({ accessToken: null, appSecret: null })}>
                    Remove keys
                  </Button>
                )}
                <Button onClick={() => save()} loading={busy === "save"}>
                  Save
                </Button>
              </div>
            </div>
            {data.mode === "api" && (
              <div className="flex gap-2">
                <Input placeholder="Test number, e.g. 5512 3456" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} inputMode="tel" />
                <Button variant="secondary" onClick={test} loading={busy === "test"} disabled={testPhone.replace(/\D/g, "").length < 8}>
                  <LuSend className="h-4 w-4" /> Test
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Message texts</p>
            <Field label="Message">
              <Select value={tplType} onChange={(e) => setTplType(e.target.value as MessageType)}>
                {MESSAGE_TYPES.filter((t) => t.type !== "CUSTOM").map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            {tpl && (
              <>
                <Field label="Text" hint={`Placeholders: ${PLACEHOLDERS.filter((p) => p !== "text").map((p) => `{${p}}`).join(" ")}`}>
                  <Textarea rows={4} value={tpl.text} onChange={(e) => setTpl({ text: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Approved template name" hint="Business API only. Empty = send the text above">
                    <Input value={tpl.templateName ?? ""} onChange={(e) => setTpl({ templateName: e.target.value || null })} className="font-mono" placeholder="renewal_reminder" />
                  </Field>
                  <Field label="Template language">
                    <Input value={tpl.language ?? ""} onChange={(e) => setTpl({ language: e.target.value || null })} className="font-mono" placeholder="en" />
                  </Field>
                  <Field label="Template variables" hint="Fill {{1}}, {{2}} … in order">
                    <Input value={tpl.params ?? ""} onChange={(e) => setTpl({ params: e.target.value || null })} className="font-mono" placeholder="firstName,plan,endDate" />
                  </Field>
                </div>
                <p className="text-xs text-muted">
                  Meta only delivers messages <i>you</i> start (reminders, birthdays) using approved templates. Create them in Meta → WhatsApp Manager → Message templates, then
                  enter the name here. Without a template, VOXI sends plain text (delivered only within 24h of the member’s last message).
                </p>
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => save()} loading={busy === "save"}>
                    Save texts
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}
