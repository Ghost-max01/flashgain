# UPDATES.md — Implementation Tracking

## Task Checklist

- [x] 1. Stake amount tiers: Replace 5,000/10,000/20,000 with 20%/30%/40%; convert 500/1,000/2,000 to also use 20%/30%/40%
  → `/app/stake/page.tsx`: STAKE_TIERS array, percentage-based buttons, custom input with balance-relative min
- [x] 2. Custom amount + "You could win" display: Show Naira value of selected percentage vs balance; show potential payout
  → `/app/stake/page.tsx`: OF BALANCE indicator, "YOU COULD WIN" shows ×2.2 payout
- [x] 3. Spin & Win randomized win logic: Math.random() per attempt, one winning tier per spin
  → `/app/stake/page.tsx`: doSpin() picks random winningTier from [20,30,40] each spin
- [x] 4. Spin frequency limits: Per-tier 24hr cooldown, max 3 spins/day
  → `/app/stake/page.tsx`: spin_tier_cooldowns localStorage, per-tier per-user 24hr timers
- [x] 6. Button rename: "Spin Now" → "Tap to Spin" in stake page CTA
  → `/app/stake/page.tsx`: Updated thumb-zone CTA button text
  → `/app/stake/page.tsx`: Button label changed to "TAP TO" / "SPIN"
- [x] 6. Live stakers ticker: Random Nigerian names + amounts (min 200,000), rotate every 5 min
  → `/app/stake/page.tsx`: NIGERIAN_NAMES array, liveTicker state, 5-min interval rotation
- [x] 7. Auto-tap toggle-off warning: Popup before disabling auto-tap when running
  → `/app/dashboard/page.tsx`: showAutoToggleWarning Dialog with Cancel/End Auto Tap options
- [x] 8. Rapid-tap warning: >3 taps/sec triggers red popup, disables taps during display
  → `/app/dashboard/page.tsx`: tapTimestamps tracking, showRapidTapWarning red popup with 2s display
- [x] 9. Spin & Win page section cleanup: Remove content between thumb-zone and wheel
  → `/app/spin/page.tsx`: Cleaned up middle section, wheel now directly follows the stake header
- [x] 10. Trust score rate change: 5 navigations = 1 point (was 1 nav = 1 point)
  → `/lib/trust-score.ts`: navPoints = Math.floor(m.navCount / 5); dashboard label updated to "5 = +1"
- [x] 11. UI cleanup — remove "The Investment" section
  → `/app/dashboard/page.tsx` & `page-new.tsx`: Investments removed from menuItems
- [x] 12. Flashgain9ja placement: Inside Quick Actions box, above Loan and Daily Tasks, flat full-width banner
  → `/app/dashboard/page.tsx`: flashgain9ja banner rendered above Daily Tasks & Loans, full-width edge-to-edge
- [x] 13. Flashgain9ja speed adjustment: Subtract 0.5 from current auto-tap speed (800ms → 300ms)
  → `/app/dashboard/page.tsx`: AUTO_TAP_INTERVAL_MS changed from 800 to 300
- [x] 14. New withdrawal requirement: Spin & Win at least once per day (0/1 → 1/1, resets daily)
  → `/app/withdraw/page.tsx`: spinPlayedToday state + localStorage tracking + requirements display
- [x] Review slowdown: "Flashgain9ja Review — What Users Are Saying" animation slowed
  → `/components/referral-reviews.tsx`: scroll animation 200s → 300s

## Notes

|| Task | File(s) | Status | Notes |
|------|---------|--------|-------|
|| 1 | `/app/stake/page.tsx` | [x] Done | STAKE_TIERS array + UI buttons |
|| 2 | `/app/stake/page.tsx` | [x] Done | Custom input + "You could win" display |
|| 3 | `/app/stake/page.tsx` | [x] Done | doSpin() function — random tier selection |
|| 4 | `/app/stake/page.tsx` | [x] Done | Per-tier cooldown tracking in localStorage |
|| 5 | `/app/stake/page.tsx` | [x] Done | Button label in spin section |
|| 6 | `/app/stake/page.tsx` | [x] Done | Live stakers section lines ~265-288 |
|| 7 | `/app/dashboard/page.tsx` | [x] Done | handleAutoToggle() function |
|| 8 | `/app/dashboard/page.tsx` | [x] Done | handleTapEarn() — rapid tap detection |
|| 9 | `/app/spin-win/page.tsx` + `/app/spin/page.tsx` | [x] Done | Section cleanup |
|| 10 | `/lib/trust-score.ts` + `/app/dashboard/page.tsx` | [x] Done | computeScore() navPoints |
|| 11 | `/app/dashboard/page.tsx` + `page-new.tsx` | [x] Done | menuItems array — remove Investments |
|| 12 | `/app/dashboard/page.tsx` | [x] Done | Quick Actions section — flashgain9ja placement |
|| 13 | `/app/dashboard/page.tsx` | [x] Done | AUTO_TAP_INTERVAL_MS 800→300 |
|| 14 | `/app/withdraw/page.tsx` | [x] Done | Withdrawal requirements display |
