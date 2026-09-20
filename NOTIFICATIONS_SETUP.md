# Offline Push Notifications — Setup & Operator Guide

Dashboard auto-tap finish alerts, tap-refill alerts, claim-ready alerts and
admin broadcasts are delivered by the OS/browser push service (like WhatsApp)
even when the app is closed — through the existing `/sw.js` worker, VAPID Web
Push and FCM. This file lists the one-time deploy steps. Nothing here changes
app logic; all sends go through `sendNotificationToUser()` (dead endpoints
are auto-cleaned).

## 1. Environment variables (Vercel → Settings → Environment Variables)

| Var | Where | Purpose |
| --- | ----- | ------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | client + server | PushManager subscription key |
| `VAPID_PRIVATE_KEY` | server only | signs Web Push payloads |
| `VAPID_SUBJECT` | server only | must be a URL or `mailto:` (e.g. `mailto:support@Moneymate9ja.money`) |
| `CRON_SECRET` | server only | Bearer token for the `/api/timer/cron` scheduler (any long random string) |
| `ADMIN_NOTIFY_SECRET` | server only | Bearer token for `/api/notifications/send` + `/api/notify/broadcast` |
| `NOTIFY_TOKEN_SECRET` | server only, optional | HMAC secret for offline-push tokens. **Defaults to `SUPABASE_SERVICE_ROLE_KEY`, so nothing to set** unless you want separation. |

Generate a VAPID pair once (do NOT commit the private key):

```bash
npx web-push generate-vapid-keys
```

Firebase (`NEXT_PUBLIC_FIREBASE_*`) is only needed for the legacy FCM channel.
Native Web Push (VAPID) works without it on Android/desktop/iOS-PWA and is
registered automatically alongside FCM.

## 2. Delivery without a frequent scheduler (Hobby-safe, 3 layers, one routine)

Vercel Hobby allows only **daily** crons, so pushes can't wait for a
scheduler. All three layers below call the same shared routine
(`flushDueNotifications` in `lib/notifications/notify-due.ts`) — one source,
kneaded together:

1. **Daily backstop cron** — pre-wired in `v0-earn-buzz/vercel.json`
   (`0 7 * * *`, Hobby-legal). Catches anything still pending once a day.
   Needs `CRON_SECRET` set (same value Vercel sends as
   `Authorization: Bearer …`; configure under Project → Settings → Cron Jobs).
2. **Traffic piggyback (the real worker)** — ~10% of successful tap accrues
   flush up to 10 due rows *after* the response (`after()`, never delays the
   user). Whenever anyone is active, due pushes land within minutes.
3. **Foreground self-ping** — the dashboard asks the cron to flush its own
   due rows every ~60s while open.

No scheduler / want 5-minute precision? Point any free external cron
(e.g. cron-job.org) at `GET https://<domain>/api/timer/cron` every 5 minutes
with header `Authorization: Bearer <CRON_SECRET>` — same endpoint, same routine.

## 3. Database

Required tables (verify with the admin-gated
`GET /api/notifications/diagnostics`): `notification_fcm_tokens`,
`notification_webpush_subscriptions`, `user_timers`. **If the two
notification tables were never created, every subscribe returns 500 and no
device can ever receive pushes — run this once in Supabase SQL editor:**

```sql
CREATE TABLE IF NOT EXISTS public.notification_fcm_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notification_webpush_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh_key text,
  auth_key text,
  expiration_time bigint,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_fcm_user ON public.notification_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_webpush_user ON public.notification_webpush_subscriptions(user_id);
```

If `user_timers` predates the type column (or any table below is missing),
run `Moneymate/updatedschema.sql` in the Supabase SQL editor — it is the
single idempotent remnants file (safe to re-run) and covers this plus
`claim_count`/`pause_until`:

```sql
-- (see updatedschema.sql §1 — paste the whole file, not just this)
```

No unique constraint is required — the scheduler uses delete+insert and
marks rows notified by `id`.

## 4. Admin broadcast (messages/announcements to users)

```bash
# one user
curl -X POST https://<domain>/api/notify/broadcast \
  -H "Authorization: Bearer <ADMIN_NOTIFY_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Scheduled maintenance","body":"Withdrawals pause 2h tonight.","clickUrl":"/dashboard","audience":{"uid":"<USER_ID>"}}'

# everyone subscribed (paged: limit ≤500, use offset to continue)
curl -X POST https://<domain>/api/notify/broadcast \
  -H "Authorization: Bearer <ADMIN_NOTIFY_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"title":"🎉 Bonus weekend","body":"2x tap earnings Saturday.","audience":{"all":true},"limit":500,"offset":0}'
```

Response: `{ success, targeted, sent, failed, truncated }`.

## 5. User-side requirements (tell support)

1. User taps **Enable** in Dashboard → Notifications (permission prompt).
2. Accounts created/logged-in **before** this ships must **log out and back
   in once** — that mints the offline-push token. The dashboard shows them a
   hint when permission is granted but no subscription exists.
3. iPhone: Web Push needs iOS 16.4+ **and** the app installed via
   Share → Add to Home Screen (Apple restriction, not ours). Android/desktop
   work straight from the browser.

## 6. How to verify it works

1. Enable notifications on a test device, confirm Dashboard → Notifications
   shows **Active** (WebPush: yes).
2. Start the 20-min FREE auto tap, close/minimize the app → at expiry you get
   “🔥 Auto Tap finished!”.
3. Exhaust 100/100 taps, close the app → 10 min later “⚡ Energy refilled!”.
4. Send a broadcast to your own uid (section 4) with the app closed → it arrives.
5. Unit tests: compile `lib/notifications/notify-auth.ts` and run the
   checks (26 assertions: token round-trip/tamper, schedule windows, per-type
   messages) — see `C:\Users\ADMIN\AppData\Local\Temp\opencode\test-notify.js`
   pattern used during development.
