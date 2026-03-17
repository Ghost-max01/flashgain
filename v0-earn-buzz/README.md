# Earn Buzz

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[Your Vercel deployment URL will appear here]**

## Build your app

Continue building your app on:

**[https://v0.dev](https://v0.dev)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Notifications (FCM + iOS Web Push)

This app now includes dual-path PWA notifications:

- Path A (Android/Desktop): Firebase Web Push token flow (`type: "fcm"`)
- Path B (iOS Home Screen): Native Web Push via `PushManager` + VAPID (`type: "webpush"`)

### Vercel + PHP backend split

Because Vercel does not run PHP directly in this Next.js app, the setup is:

1. Deploy this Next.js app on Vercel.
2. Deploy the PHP notification backend (`backend/`) on a PHP host.
3. Configure Vercel env vars to proxy requests:

- `NOTIFICATION_BACKEND_URL`
- `NOTIFICATION_SUBSCRIBE_PATH`
- `NOTIFICATION_SEND_PATH`

The app calls local Vercel routes:

- `/api/notifications/subscribe`
- `/api/notifications/send`

Those routes forward to PHP endpoints.

### Supabase integration note

- Use Supabase auth user id (`user.id`) as `uid` in subscribe payloads.
- Existing business data can stay in Supabase; push subscriptions are stored in backend MySQL as requested.

### GitHub/Vercel deployment checklist

- Commit and push changes to GitHub.
- In Vercel project settings, add env values from `.env.local.example`.
- Redeploy.
- Verify helper buttons appear once per 24h and diagnostics JSON is copyable.

### iOS QA notes

- Safari tab mode should show Add-to-Home-Screen guidance only.
- Home Screen install should allow prompt on user gesture.
- If icons/manifest changed, uninstall PWA, clear site data, re-add to Home Screen.
