# WhatsApp in VOXI

VOXI can send members renewal reminders, "we miss you" messages, welcome messages with their
digital card, birthday wishes, visit-milestone congratulations, payment receipts and custom messages.

## Two modes (chosen automatically per gym)

| Mode | Setup | What happens when staff press **Remind** |
|------|-------|-------------------------------------------|
| **WhatsApp links** (default) | none | WhatsApp (web or app) opens with the message ready; staff press send |
| **Business API** | Meta keys in Settings → WhatsApp | VOXI sends from the gym's WhatsApp Business number; “Remind all” works; delivery/read ticks are tracked |

Every message is saved in the WhatsApp log (`/messages`) and on the member's profile, so the
dashboard knows who was already reminded this week.

## Connecting the WhatsApp Business (Cloud) API

1. In [Meta for Developers](https://developers.facebook.com/) create an app → add **WhatsApp**.
2. Add and verify the gym's phone number. Copy the **Phone number ID** (and WhatsApp Business account ID).
3. Create a **System user** in Meta Business settings, give it the app, and generate a **permanent token**
   with `whatsapp_business_messaging` (and `whatsapp_business_management`).
4. In VOXI → **Settings → WhatsApp** paste the Phone number ID, token and the app's **App secret**,
   switch on “Send automatically”, Save, then use **Test** to send yourself a message.
5. Webhook (for delivered/read ticks): in Meta → WhatsApp → Configuration set
   - Callback URL: the URL shown in VOXI (`https://<your-domain>/api/whatsapp/webhook/<gym-id>`)
   - Verify token: the token shown in VOXI
   - Subscribe to the **messages** field.
   Your site must be online over https (e.g. on Vercel) for Meta to reach it.

Tokens and the app secret are stored encrypted (AES-256-GCM, key derived from `AUTH_SECRET`).
If you change `AUTH_SECRET`, re-enter the WhatsApp token.

## Templates (important)

WhatsApp only delivers messages that **you start** (reminders, birthdays…) when they use a
template approved by Meta. Create templates in WhatsApp Manager → Message templates, e.g.

```
renewal_reminder (en):  Hi {{1}}, your {{2}} membership at {{3}} ends on {{4}}. Reply to renew.
```

Then in VOXI → Settings → WhatsApp → Message texts choose the message, enter the template name,
language (`en` / `ar`) and the variables that fill `{{1}}`, `{{2}}`… in order, e.g.
`firstName,plan,gym,endDate`. Without a template name VOXI sends plain text, which Meta only
delivers within 24 hours of the member's last message to you.

Placeholders: `{firstName} {name} {gym} {code} {plan} {endDate} {daysLeft} {cardUrl} {visits} {amount} {invoiceNo} {description}`.

## API

| Method | Path | Who |
|--------|------|-----|
| POST | `/api/whatsapp/send` `{ memberId, type, text? }` | Owner, Manager, Reception |
| POST | `/api/whatsapp/bulk` `{ memberIds, type }` (API mode only) | Owner, Manager, Reception |
| GET | `/api/whatsapp/messages?type=&memberId=` | Owner, Manager, Reception |
| GET/PUT | `/api/whatsapp/config` | read: front desk · change: Owner |
| POST | `/api/whatsapp/test` `{ phone }` | Owner |
| GET/POST | `/api/whatsapp/webhook/<gym-id>` | Meta (verified by token / signature) |
