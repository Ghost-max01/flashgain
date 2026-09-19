# Boochat Partner Integration Setup

This document outlines how to integrate Boochat (a partner chat app) with Money mate 9ja (or any other partner site using this codebase).

## Overview

The Boochat integration allows users to:
1. **Join** the partner channel directly from the in-app mailbox (signed JWT link + redirect to Boochat auth)
2. **Receive notifications** when Boochat sends channel posts or direct messages
3. **Track membership** in the `boochat_membership` database table

## Environment Setup

### 1. Generate Secrets

Generate two cryptographically secure secrets:

```bash
# Shared secret (for signing join tokens with HS256)
openssl rand -hex 32

# Webhook secret (for verifying inbound webhooks with HMAC-SHA256)
openssl rand -hex 32
```

### 2. Configure Environment Variables

Add the following to your `.env.local` or deployment environment:

```
# Boochat Base URL (no trailing slash)
BOOCHAT_BASE_URL=https://boochat.example.com

# Partner identifier (slug) — must match what Boochat has on file
BOOCHAT_PARTNER_SLUG=moneymate9ja

# Human-friendly name shown in the UI
BOOCHAT_PARTNER_NAME=Money mate 9ja

# Shared secret for signing join tokens (from step 1)
BOOCHAT_SHARED_SECRET=<your-32-byte-hex>

# Webhook secret for verifying incoming webhooks (from step 1)
BOOCHAT_WEBHOOK_SECRET=<your-32-byte-hex>

# Supabase (already required)
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**IMPORTANT:** Do NOT commit these secrets to version control. Use a `.env.local` file (which is .gitignored) or a secrets management system.

### 3. Database Migration

Run the Boochat membership migration on your Supabase instance:

```sql
-- From scripts/008_create_boochat_membership.sql
create table if not exists public.boochat_membership (
  user_id text primary key,
  joined_at timestamptz default now()
);

create index if not exists idx_boochat_membership_user on public.boochat_membership(user_id);
```

You can run this via:
- Supabase SQL editor (web console)
- Migration tool / CLI
- Or copy-paste into your migration runner

## Boochat Partner Registration

Contact your Boochat administrator to register your partner site:

### Required Information

1. **Partner Slug:** `BOOCHAT_PARTNER_SLUG` (e.g., `moneymate9ja`)
   - This is the unique identifier for your partner site
   - Must match the value in your environment variables

2. **Base URL:** `BOOCHAT_BASE_URL` (e.g., `https://moneymate9ja.com`)
   - The canonical URL of your site (used for branding, redirects, etc.)
   - Must be HTTPS in production
   - No trailing slash

3. **Shared Secret:** `BOOCHAT_SHARED_SECRET`
   - Used by your backend to sign join tokens (JWT HS256)
   - Boochat uses this to verify tokens are legitimate
   - Must be kept confidential

4. **Webhook Secret:** `BOOCHAT_WEBHOOK_SECRET`
   - Used by Boochat to sign webhook requests
   - Your backend uses this to verify webhook authenticity (HMAC-SHA256)
   - Must be kept confidential; **must be different from shared secret**

5. **Webhook Endpoint:** `https://<your-site>/api/boochat/webhook`
   - Public HTTPS endpoint where Boochat will send events
   - Must return a 200 OK response within 30 seconds
   - Boochat will retry failed requests with exponential backoff

## How It Works

### Join Flow

1. User clicks "Join" card in the in-app mailbox
2. Browser navigates to `/api/boochat/link` (server-side route)
3. Route:
   - Reads the user's session cookie (`tivexx-session`)
   - Extracts user ID, email, name
   - Signs a JWT token using `BOOCHAT_SHARED_SECRET` (HS256, 5-minute expiry, includes nonce)
   - Returns a 302 redirect to: `${BOOCHAT_BASE_URL}/auth?partner=${slug}&token=${jwt}`
4. User lands on Boochat auth page
5. Boochat verifies the JWT token using `BOOCHAT_SHARED_SECRET`
6. If valid, Boochat logs in the user and sends a `member_joined` webhook

### Push Notification Flow

When Boochat sends events, it POSTs to `/api/boochat/webhook` with:

```
POST /api/boochat/webhook
X-Boochat-Timestamp: <unix-timestamp>
X-Boochat-Signature: sha256=<hmac-hex>
Content-Type: application/json

{
  "event_type": "channel_post" | "direct_message" | "member_joined",
  "partner": "moneymate9ja",
  ...event details...
}
```

Your backend:
1. Reads `X-Boochat-Timestamp` and verifies it's within ±5 minutes (replay protection)
2. Verifies `X-Boochat-Signature` using HMAC-SHA256 over `${timestamp}.${raw-body}` with `BOOCHAT_WEBHOOK_SECRET` (constant-time comparison)
3. Filters recipients against the `users` table to prevent sending to non-existent accounts
4. For `member_joined`: upserts rows into `boochat_membership`
5. For `channel_post` / `direct_message`: 
   - Calls `sendNotificationToUser()` to mirror the message to `notification_inbox`
   - Uses dedupeKey `boochat:${event_id}:${recipient}` to prevent duplicates on webhook retries
   - Automatically sends FCM + Web Push notifications via the existing push infrastructure
   - Upserts the sender into `boochat_membership` to mark them as a member contributor

### Deduplication

Boochat may retry webhooks if your endpoint doesn't respond with 200 OK in time. To prevent duplicate notifications:

- Each webhook event is identified by `event_id` (from Boochat)
- Your `/api/boochat/webhook` route uses a dedupeKey: `boochat:${event_id}:${recipient}`
- The existing `notification_inbox` table has a unique constraint on `dedupeKey`
- If the same webhook is received twice, the second insert will be skipped (on-conflict upsert)

## Testing

### Local Testing

Use the provided dev test script to validate your setup locally:

```bash
# Set environment variables
export BOOCHAT_BASE_URL="http://localhost:3000"
export BOOCHAT_PARTNER_SLUG="testpartner"
export BOOCHAT_PARTNER_NAME="Test Partner"
export BOOCHAT_SHARED_SECRET="test-shared-secret-32-bytes-long-"
export BOOCHAT_WEBHOOK_SECRET="test-webhook-secret-32-bytes-long-"

# Run tests
node dev_boochat_test.js
```

The script will:
1. Generate a signed join token
2. Send `member_joined`, `channel_post`, and `direct_message` webhooks
3. Print response codes and sample payloads
4. Guide you to check `boochat_membership` and `notification_inbox` tables in Supabase

### Manual Testing

1. **Signed Link:**
   - Start the dev server: `npm run dev`
   - Log in to the app
   - Open the mailbox (mail icon)
   - Click "Join" card
   - You should be redirected to `${BOOCHAT_BASE_URL}/auth?partner=...&token=...`
   - Token will be a valid JWT signed with `BOOCHAT_SHARED_SECRET`

2. **Webhooks:**
   - Use a tool like `curl`, Postman, or the dev script to send signed webhook requests
   - Verify rows appear in `boochat_membership` after `member_joined`
   - Verify rows appear in `notification_inbox` after `channel_post` / `direct_message`
   - Check app logs / Firebase console for FCM push attempts
   - Send the same webhook twice (same event_id) — confirm no duplicates

## Files Modified / Added

### New Files

- `lib/boochat/config.ts` — Environment variable loader and config validator
- `app/api/boochat/link/route.ts` — Signed join link route (GET, signs JWT)
- `app/api/boochat/webhook/route.ts` — Webhook receiver (POST, verifies HMAC and signature)
- `scripts/008_create_boochat_membership.sql` — Database migration for membership tracking
- `dev_boochat_test.js` — Local dev test script

### Modified Files

- `app/api/notify/inbox/route.ts` — Added `boochatJoined` (boolean) and `partnerName` (string) to response
- `app/dashboard/page.tsx` — Added "Join" card to mailbox popup (shown when `boochatJoined === false`)

## Troubleshooting

### Webhook signature verification fails

**Symptoms:** Webhook returns 401 Unauthorized

**Causes:**
- `BOOCHAT_WEBHOOK_SECRET` is incorrect or mismatched with Boochat's records
- Timestamp is outside ±5 minute window (clock skew; sync system time)
- Raw body is being modified before verification (middleware, buffering issues)

**Fixes:**
- Double-check both secrets with Boochat admin
- Verify system time is accurate (NTP synchronized)
- Ensure middleware doesn't parse/stringify the request body before reaching the webhook route

### Notifications not appearing in inbox

**Symptoms:** Webhook returns 200 OK, but no rows in `notification_inbox`

**Causes:**
- Recipient user_id doesn't exist in `users` table
- `sendNotificationToUser()` failed silently (check server logs)
- FCM / webpush service is misconfigured

**Fixes:**
- Verify recipient user IDs match those in your `users` table
- Check server logs for errors from `sendNotificationToUser()`
- Review FCM and web-push configuration in `lib/notifications/`

### Join link generates 500 error

**Symptoms:** `/api/boochat/link` returns 500

**Causes:**
- `BOOCHAT_SHARED_SECRET` or other Boochat env vars are missing
- Session cookie not found or corrupted
- Crypto module issue

**Fixes:**
- Verify all `BOOCHAT_*` env vars are set: run `env | grep BOOCHAT`
- Ensure user is logged in (session cookie exists)
- Check server logs for exact error message

### Redirect to Boochat auth page doesn't work

**Symptoms:** Signed link redirects, but Boochat returns "Invalid token" or "Unauthorized"

**Causes:**
- `BOOCHAT_SHARED_SECRET` mismatch between your app and Boochat's records
- Token is expired (> 5 minutes old)
- Token payload mismatch (email, name, or user_id format)

**Fixes:**
- Confirm `BOOCHAT_SHARED_SECRET` with Boochat admin
- Test immediately after link generation (< 5 minutes)
- Check token contents with JWT decoder (jwt.io) — ensure payload format matches Boochat's expectations

## Reusability

This integration is designed to work with **any partner site** using this codebase:

- **No hardcoded names:** All partner names and URLs come from environment variables
- **No hardcoded channels:** Boochat sends channel names in webhook payloads; your app displays them as-is
- **No hardcoded slugs:** Partner slug is fully configurable via `BOOCHAT_PARTNER_SLUG`
- **Config-driven:** All security-critical values (secrets, URLs, slugs) are loaded once at startup via `lib/boochat/config.ts` and validated

To integrate a **second partner** (e.g., another chat app):
1. Create a new config module: `lib/customchat/config.ts` (same pattern as `lib/boochat/config.ts`)
2. Create new signed link route: `app/api/customchat/link/route.ts`
3. Create new webhook route: `app/api/customchat/webhook/route.ts`
4. Create new migration: `scripts/009_create_customchat_membership.sql`
5. Add new env vars: `CUSTOMCHAT_BASE_URL`, `CUSTOMCHAT_PARTNER_SLUG`, etc.
6. Update mailbox UI to show multiple join cards (one per partner)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Run the dev test script to isolate the issue
4. Contact Boochat support to verify partner registration and secrets
5. Contact the app development team for code issues

---

**Last Updated:** September 2026  
**Integration Version:** 1.0  
**Status:** Production Ready
