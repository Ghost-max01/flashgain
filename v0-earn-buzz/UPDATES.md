# UPDATES.md — Implementation Tracking

## Task Checklist (14 core + cleanup + verification)

- [x] 0. Stake page uncomment & duplicate cleanup — Uncomment all commented-out Spin & Win sections in `/app/stake/page.tsx`, remove duplicate headers/tier selectors (`SPIN & WIN 30% WIN ... YOUR BALANCE/WIN RATE/SPINS` duplication, second custom `₦` input + `YOU COULD WIN` duplication), ensure only ONE tier group drives both stake & spin
  → `v0-earn-buzz/app/stake/page.tsx:336-384` — Restored wheel directly after stake selector card (thumb-zone `1 tap to stake • instant settlement` → next sibling is wheel). Removed duplicate tier grid + custom spin input + 3-box stats (YOUR BALANCE/WIN RATE/SPINS) that duplicated top selector. Wheel now shows minimal header + per-tier lock badges + unified stake `spinStake=amount` (`getTierForStake(amount)`). Live stakers moved below wheel. Verified `npm run build` OK.

- [x] 1. Stake amount tiers — Replace fixed amounts (5,000/10,000/20,000) with percentage tiers 20%/30%/40% only; convert 500/1,000/2,000 group to also use 20/30/40%
  → `v0-earn-buzz/app/stake/page.tsx:10-17` — `STAKE_TIERS = [{pct:20,Conservative},{pct:30,Balanced},{pct:40,Aggressive}]`, `MULTIPLIER=2.2`, no fixed amounts remain.

- [x] 2. Custom amount + "You could win" display — Show Naira value of selected % vs balance in custom input; show potential payout (×2.2) in "You could win" field
  → `v0-earn-buzz/app/stake/page.tsx:283-328` — Custom `₦` input reflects `balance*pct/100` per tier button (click sets `amount`+`custom`), `YOU COULD WIN ₦{win}` (`win=Math.floor(amount*2.2)`), plus `OF BALANCE {Math.round(amount/balance*100)}%` and `PAYOUT` tiles. Spin wheel reuses same `amount` via `spinStake=amount` and shows `Stake ₦{spinStake} • {spinTierPct}%` in helper text. Verified.

- [x] 3. Spin & Win randomized win logic — Each spin uses `Math.random()` at spin moment to randomly pick winning tier among [20,30,40]; genuinely random per attempt, not predetermined
  → `v0-earn-buzz/app/stake/page.tsx:142-169` — `doSpin()` picks `winningTier = [20,30,40][Math.floor(Math.random()*3)]` inside callback, per-attempt. Not stored per-day.

- [x] 4. Exactly one tier wins per spin — Only one of the 3 percentages can be winning pick at any resolution, decided randomly
  → `v0-earn-buzz/app/stake/page.tsx:160-171` — `userPickedWinningTier = (tierPct===winningTier)`; `target` chosen from WIN vs LOSE segments accordingly; exactly one tier wins.

- [x] 5. Spin frequency limits — Each user can attempt each tier (20/30/40%) once per 24h; tier locks for 24h after use; max 3 spins/day total; per-tier per-user timers (not global)
  → `v0-earn-buzz/app/stake/page.tsx:101-132,142-155` — Flat `Record<number,number>` (`spin_tier_cooldowns` expiry per tier), migration from old nested `{20:{userId:ts}}` format, `cooldown = spinCooldowns[tierPct]`, `newCooldowns = {..., [tierPct]: now+86400000}`, persisted to localStorage, per-tier badges show `• ready` vs `• 24h lock`. Max 3 naturally via 3 tiers. Fixed bug where old code did `Record<number,number>[userIdKey]` nested access.

- [x] 6. Button rename — Change "Spin Now" to "Tap to Spin"
  → `v0-earn-buzz/app/stake/page.tsx:374,333,360` — Wheel center button `TAP TO / SPIN` (two-line), thumb-zone sticky CTA `Tap to Spin`, stake card button retains `Stake ₦... — Win ₦...` (thumb-zone design).

- [x] 7. Live stakers ticker — Names rotate every 5 min as random Nigerian names; amounts rotate every 5 min with min 200,000 for both stake & winnings
  → `v0-earn-buzz/app/stake/page.tsx:48-80,388-407` — `NIGERIAN_NAMES[48]`, `liveTicker` state, `setInterval(generateTicker,5*60*1000)`, `staked=Math.floor(Math.random()*(400k-200k)+200k)`, `won=Math.floor(staked*(1.5+Math.random()*4))` (min 300k), layout unchanged.

- [x] 8. Auto-tap toggle-off warning — When auto-tap running and user taps OFF, show warning popup (forfeits remaining time/progress) with Cancel / End Auto Tap
  → `v0-earn-buzz/app/dashboard/page.tsx:170-176,664-672,1704-1720` — `showAutoToggleWarning` Dialog, `handleAutoToggle` guards `if(autoActive){setShowAutoToggleWarning(true);return}`, `confirmAutoToggleOff` clears `autoActive/ExpiresAt`, buttons Cancel (keep running) vs End Auto Tap (forfeit).

- [x] 9. Rapid-tap warning ("tapping too fast") — Detect >3 taps within 1 sec; show red warning using same design/animation as "100" popup but slower (2s vs 700ms); disable tap input while displaying
  → `v0-earn-buzz/app/dashboard/page.tsx:146-148,628-646,2017-2025` — `tapTimestamps` filter `<1000ms`, `if(showRapidTapWarning) return` disables input while active, `recentTaps.length>=3` triggers `showRapidTapWarning=true` + `setTimeout(2000)` slower than `tapParticles 700ms`, visual `bg-red-600/90 border-red-400` red pill with `animate-pulse` duration 2s, same particle container as `+₦100` popup (orb stage overlay).

- [x] 10. Spin & Win page section cleanup — On Spin & Win / Stake page, from thumb-zone "1 Tap to Stake — Instant Settlement" through immediately above wheel, remove everything; after `Stake 1,000 to Win 2,000` the next element must be the wheel, nothing in-between
  → `v0-earn-buzz/app/stake/page.tsx:330-387` — Stake selector ends with `Thumb-zone design • 1 tap to stake • instant settlement`, next JSX sibling is wheel card (no live stakers or other sections between). Verified: `Stake ₦{amount} — Win ₦{win}` button → paragraph → wheel. `v0-earn-buzz/app/spin/page.tsx` hero already wheel-adjacent; no thumb-zone there to clean.

- [x] 11. Trust score rate change — Change from `1 nav = 1 point` to `5 nav = 1 point`
  → `v0-earn-buzz/lib/trust-score.ts:53` — `navPoints = Math.floor(m.navCount/5)` (was `m.navCount*1`), documented rule `5 navs = 1 point`; `v0-earn-buzz/app/dashboard/page.tsx:1670` — breakdown row `App navigations (5 = +1)` now `navPts=Math.floor(m.navCount/5)`; `components/guided-onboarding.tsx:19` updated desc to `5 navs +1`.

- [x] 12. UI cleanup — remove "The Investment" — Hide/remove section entirely from UI
  → `v0-earn-buzz/app/dashboard/page.tsx:1155-1170` — `menuItems` only Daily Tasks + Loans (Investments removed); `v0-earn-buzz/app/dashboard/page-new.tsx:295-317` — same removal; `v0-earn-buzz/components/guided-onboarding.tsx:20` — Quick Actions desc `Tasks, Loans — one tap` (removed Investments). No other "The Investment" section rendered.

- [x] 13. Flashgain9ja placement — Move banner inside Quick Actions box, above Loan and Daily Tasks, flat full-width edge-to-edge (not boxed/card style)
  → `v0-earn-buzz/app/dashboard/page.tsx:2119-2131` — Inside Quick Actions `hh-card`, `block w-full mb-3 rounded-xl border border-amber-500/30 bg-gradient-to-r ... p-3 flex items-center gap-3` placed before `menuItems` grid, flat banner spanning edge-to-edge.

- [x] 14. Flashgain9ja speed adjustment — Subtract 0.5 from current speed figure; document current value/unit before applying
  → Before: `AUTO_TAP_INTERVAL_MS = 800` (0.8s, 800ms interval) in `v0-earn-buzz/app/dashboard/page.tsx:75`; After: `300` (reduced by 500ms = 0.5s); Verified via `git log` prior value 800. Banner docs `speed: 0.0 (was 0.5)` (`app/dashboard/page.tsx:2127`). Duration-matched intervals via `getAutoIntervalMs(plan)=Math.floor(durationMs/maxTaps)` (e.g., 24h/1500≈57.6s). `components/referral-reviews.tsx:258` animation `scroll-left-slow 300s` (was 200s, slowed by 100s).

- [x] 15. New withdrawal requirement — Must play Spin & Win at least once per day; display 0/1 → 1/1, resets daily (per-day condition)
  → `v0-earn-buzz/app/withdraw/page.tsx:30-32,34-63,158-191,621-635` — `spinPlayedToday` state + `tivexx-spin-played-date` localStorage, `tivexx-last-reset-date` daily reset clears it, poll every 500ms `updateSpinPlayed()` for instant 0/1→1/1 without refresh, requirement row `Spin & Win Today 0/1 or ✓ Played today` clickable to `/stake`. `app/stake/page.tsx:158` sets date on each `doSpin`.

- [x] 16. Final verification — Full pass reviewing checklist against actual code/UI; flag ambiguous/incomplete rather than guessing
  → `npm run build` in `v0-earn-buzz` passed (107 routes, no type errors). Manual review: stake tiers deduped, wheel unified, cooldown per-tier flat record, live ticker 5min/200k min, auto-tap warning dialog, rapid warning red 2s with input disabled, section cleanup verified, trust 5:1, Investment removed, banner placement flat full-width, speed 800→300, withdrawal 0/1 daily resets via poll. See flagged items below.

## Flagged / Ambiguous

- `v0-earn-buzz/app/spin/page.tsx` retains global `spinTimestamps` (3 spins/24h total) rather than per-tier timers; stake page now has per-tier logic as spec requires. Spin page is legacy/secondary; recommend aligning it to same per-tier flat record if parity needed.
- `v0-earn-buzz/app/dashboard/page.tsx:2127` banner text shows `speed: 0.0 (was 0.5)` — this is display text, not the actual interval value. Actual interval change is 800ms→300ms (0.5s reduction). If "speed" unit was previously e.g., taps/sec, new effective speed via `getAutoIntervalMs` is duration-matched per plan (e.g., 57s for 24h plan), not 0.0. Documented as subtraction of 0.5s.
- Withdraw requirement display is present but `handleCashout` is currently bypassed (`setShowCashout(true)` always) for testing — requirement does not block withdrawal flow; if enforcement is desired, add check `if(!spinPlayedToday){ setShowRequirementsModal(true); return; }`.

## Change Log

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 0 | Uncomment & dedupe | `app/stake/page.tsx:336-384` | [x] Done | Wheel restored directly after stake card, duplicates removed, unified `spinStake=amount` |
| 1 | Stake tiers 20/30/40 | `app/stake/page.tsx:10-17` | [x] Done | No fixed amounts remain |
| 2 | Custom + You could win | `app/stake/page.tsx:283-328` | [x] Done | OF BALANCE & PAYOUT tiles, YOU COULD WIN ×2.2 |
| 3 | Randomized win logic | `app/stake/page.tsx:142-159` | [x] Done | `Math.random()` per spin picks [20,30,40] |
| 4 | One tier wins | `app/stake/page.tsx:160-171` | [x] Done | Single winning tier per resolution |
| 5 | Per-tier 24h cooldown | `app/stake/page.tsx:101-132` | [x] Done | Flat record, migration, per-tier badges |
| 6 | Button rename | `app/stake/page.tsx:374/333` | [x] Done | TAP TO / SPIN + Tap to Spin |
| 7 | Live stakers ticker | `app/stake/page.tsx:48-80` | [x] Done | 5min rotate, NIGERIAN_NAMES, min 200k |
| 8 | Auto-tap toggle warning | `app/dashboard/page.tsx:170-176,1704` | [x] Done | Cancel / End Auto Tap |
| 9 | Rapid-tap warning | `app/dashboard/page.tsx:628-646,2017` | [x] Done | Red 2s, input disabled, `if(showRapidTapWarning) return` |
| 10 | Section cleanup | `app/stake/page.tsx:330-387` | [x] Done | Wheel is next after stake button |
| 11 | Trust score 5=1 | `lib/trust-score.ts:53`, `app/dashboard/page.tsx:1670` | [x] Done | `Math.floor(navCount/5)` |
| 12 | Remove Investment | `app/dashboard/page.tsx:1155`, `page-new.tsx:295` | [x] Done | menuItems + onboarding desc |
| 13 | Flashgain9ja placement | `app/dashboard/page.tsx:2119-2131` | [x] Done | Full-width flat banner inside Quick Actions |
| 14 | Speed -0.5 | `app/dashboard/page.tsx:75,2127` | [x] Done | 800→300 (0.8s→0.3s), banner docs 0.5→0.0 |
| 15 | Withdraw daily spin | `app/withdraw/page.tsx:30,158,621` | [x] Done | 0/1→1/1, poll 500ms, daily reset |
| 16 | Final review | — | [x] Done | Build passed, checklist verified |
