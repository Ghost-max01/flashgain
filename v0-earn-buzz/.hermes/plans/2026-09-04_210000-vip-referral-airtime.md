# VIP Referral Airtime + Approved/Pending Referral Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a ₦500 VIP welcome reward in Referral page that auto-credits on first login, is redeemable once as direct airtime (Paystack-backed), with its own withdrawal balance, then enforces ₦10,000 (20 referrals) minimum for subsequent referral withdrawals; pending referrals become approved only when referred user reaches Beginner (Trust Score >=30).

**Architecture:** Local-first VIP balance (tivexx-referral-vip) + server mirror (users.referral_vip_balance, vip_redeemed flag), isolated referral withdrawal ledger (referral-withdraws), airtime purchase via new POST /api/airtime (wraps Paystack/bills provider - VTpass/Shago/Paystack bill), referral approval job checks referred users' trust-meta (or users.trust_score) >=30. All compounds on existing trust-score/lib/trust-score.ts TRUST_LEVELS (Beginner min 30).

**Tech Stack:** Next.js 15.4.8 (v0-earn-buzz), React 19, Supabase (users, referrals tables), Paystack (existing vercel env `PAYSTACK_SECRET_KEY`), localStorage session (persistUserSession), trust-score module.

---

### Task 1: Document type & storage keys

**Objective:** Add VIP types/constants without behavior change.

**Files:**
- Modify: `v0-earn-buzz/lib/trust-score.ts:14-20` (verify Beginner threshold already 30, no change needed - just confirm)
- Create: `v0-earn-buzz/lib/referral-vip.ts` (new)

**Step 1: Create file**
```ts
// v0-earn-buzz/lib/referral-vip.ts
export const VIP_AMOUNT = 500;
export const VIP_KEY = "tivexx-referral-vip"; // { available: number, redeemed: boolean, phone?: string }
export const VIP_REDEEMED_KEY = "tivexx-vip-redeemed";
export const REFERRAL_MIN_WITHDRAW = 10000; // after VIP redeemed
export const REFERRAL_VIP_MIN = 500;
export interface VipState { available: number; redeemed: boolean; history: { phone: string; network: string; date: string; status: string }[] }
export function loadVip(): VipState { try{ const r=localStorage.getItem(VIP_KEY); if(r) return JSON.parse(r);}catch{} return { available: VIP_AMOUNT, redeemed:false, history:[] } }
export function saveVip(s:VipState){ localStorage.setItem(VIP_KEY, JSON.stringify(s)); localStorage.setItem(VIP_REDEEMED_KEY, s.redeemed? "1":"0"); }
```

**Step 2: Verify**
Run: `npx tsc --noEmit --skipLibCheck` expect only pre-existing abouttivexx li error.

**Step 5: Commit**
`git add lib/referral-vip.ts && git commit -m "feat(vip): add referral VIP constants"`

### Task 2: Auto-credit VIP on first login/signup

**Objective:** On dashboard mount and after /api/signup, seed VIP 500 if not redeemed.

**Files:**
- Modify: `v0-earn-buzz/app/api/signup/route.ts:75-90` (ensure new users get vip row - optional supabase column referral_vip_balance default 500)
- Modify: `v0-earn-buzz/app/dashboard/page.tsx:1160-1173` (where tutorial check happens - add vip seeding)
- Modify: `v0-earn-buzz/app/refer/page.tsx:245-299` (on load, if !localStorage VIP_KEY then init 500)

**Step 1: Code**
In dashboard useEffect after `tutorialShown` check:
```ts
try { if(!localStorage.getItem("tivexx-referral-vip")) {
  const vip = { available: 500, redeemed:false, history:[] };
  localStorage.setItem("tivexx-referral-vip", JSON.stringify(vip));
  // also sync to supabase users.referral_vip_balance if uid exists
  if(uid) fetch("/api/referral-vip",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({userId: uid, available:500})});
}} catch{}
```
In refer page useEffect init same guard; display banner if VipState.available>0 && !redeemed.

**Step 2: Test**
Manual: clear localStorage, login -> localStorage.getItem("tivexx-referral-vip") === {"available":500,"redeemed":false}

### Task 3: Referral VIP card + Airtime form UI

**Objective:** In refer/page.tsx, add exclusive VIP withdrawal card above Hero card.

**Files:**
- Modify: `v0-earn-buzz/app/refer/page.tsx:422-483` (insert before Hero Card)

**Step 1: UI**
Card: gradient emerald->teal, title "VIP Welcome ₦500", desc "Convert to airtime instantly - one-time". If not redeemed: show network select (MTN/GLO/Airtel/9mobile), phone input (11 digits), button "Convert ₦500 to Airtime" (calls /api/airtime). If redeemed: show "✓ Redeemed on {date} to {phone}" + history. Disable referral withdraw until VIP handled or not - but VIP is separate balance.

Add state: `const [vip, setVip]=useState(loadVip()); const [vipPhone,setVipPhone]=useState(""); const [vipNetwork,setVipNetwork]=useState("MTN"); const [vipLoading,setVipLoading]=useState(false);`

Update header badge: keep `each ₦500` (fix from 5k) already done.

**Step 2: Verify**
`tivexx-referral-vip` redeemed false -> card shows form; after success -> card shows redeemed.

### Task 4: POST /api/airtime route (Paystack-backed)

**Objective:** Server proxy to buy airtime, deduct VIP balance atomically.

**Files:**
- Create: `v0-earn-buzz/app/api/airtime/route.ts`

**Step 1: Implementation**
```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(req: NextRequest){
  const { userId, phone, network, amount } = await req.json();
  if(!userId || !phone || !network || amount!==500) return NextResponse.json({error:"Invalid"}, {status:400});
  // 1. check supabase users.referral_vip_balance/redeemed or fallback - allow once
  // 2. call provider: if PAYSTACK_SECRET_KEY then attempt Paystack bill? else VTpass/shago stub.
  // For now: if process.env.AIRTIME_PROVIDER === "paystack" use paystack, else simulate success if phone validates /^0[789][0-9]{9}$/
  // 3. on success: set vip redeemed, zero available, insert into referral_withdraws with type='vip_airtime'
  // 4. return { success:true, reference }
}
```
Env needed: `PAYSTACK_SECRET_KEY` already on Vercel, add `AIRTIME_PROVIDER` optional. Log but don't expose secret.

Fallback: If no real provider configured, simulate success and log "SIMULATED airtime to {phone} {network} ₦500" - user has real Paystack, so they can later wire real call (Paystack Bills API `POST https://api.paystack.co/bill` or VTpass). Leave TODO comment with exact Paystack curl.

**Step 2: Test**
`curl -X POST http://localhost:3000/api/airtime -H "Content-Type: application/json" -d '{"userId":"test","phone":"08011111111","network":"MTN","amount":500}'` -> {success:true}

### Task 5: Separate referral withdrawal ledger & min 10k after VIP

**Objective:** Make referral withdrawals distinct from main balance, enforce min.

**Files:**
- Modify: `v0-earn-buzz/app/refer/page.tsx:620-700` (where withdraw button/logic lives - currently no explicit button, need to add)
- Create: `v0-earn-buzz/app/api/referral-withdraw/route.ts`
- Modify: `v0-earn-buzz/app/withdraw/page.tsx` (ensure main withdraw not affected)

**Step 1: Logic**
Referral withdraw state: `referralWithdrawBalance = referral_balance (approved only) + (vip redeemed? 0 : 500)`? Actually VIP is separate - only 500 via airtime. After VIP redeemed, referral withdraw uses only approved referrals. Minimum checks:
```ts
const vip = loadVip();
if(!vip.redeemed) min = 500; else min = 10000;
const available = approvedCount * 500; // only approved
```
Disable Withdraw button if available < min, show "Need 20 referrals (₦10,000) - you have {approvedCount}" after VIP.

Add Dialog for referral withdraw: amount, bank details (reuse getBankDetails), calls POST /api/referral-withdraw with type='referral'.

**Step 2: API**
Insert into `referral_withdraws` (or `withdrawals` with source='referral') and deduct referral_balance atomically. If supabase table missing, fallback to localStorage `tivexx-referral-withdraws`.

### Task 6: Approved vs Pending referrals (Beginner gate)

**Objective:** Pending referrals become approved only when referred user Trust Score >=30.

**Files:**
- Create: `v0-earn-buzz/app/api/referral-stats/route.ts` enhancement (already exists - modify to join trust score)
- Modify: `v0-earn-buzz/lib/trust-score.ts` (export Beginner threshold constant)
- Modify: `v0-earn-buzz/app/refer/page.tsx:260-300` (render two counts)

**Step 1: Server**
In referral-stats, after fetching referrals for userId, for each referred_id fetch users.trust_score or compute from trust-meta? Simpler: add column `users.trust_score` updated by client on each computeScore save (POST /api/user-trust). Then:
```ts
let approved = 0, pending = 0;
for (const r of referrals) {
  const { data: u } = await supabase.from("users").select("trust_score").eq("id", r.referred_id).single();
  if((u?.trust_score ?? 0) >= 30) approved++; else pending++;
}
return NextResponse.json({ referral_count: approved+pending, approved_count: approved, pending_count: pending, referral_balance: approved*500 });
```
If trust_score column not existent, fallback query `tivexx-trust-meta` via new endpoint `GET /api/user-trust?userId=...` and check local.

**Step 2: Client display**
In refer page, replace single count with two badges:
- Approved: {approved_count} × ₦500
- Pending: {pending_count} (grey) tooltip "Pending - friend needs to reach Beginner (30 trust)"
Update animatedEarnings to use approved only: `approved_count * 500` (not pending). Keep pending display separate as awaiting.

Add useEffect polling: every 60s re-fetch referral-stats to promote pending->approved.

**Step 3: Seed referred user trust update**
In dashboard trust sync (where saveMeta), also POST to /api/user-trust to keep server column fresh.

### Task 7: Tests / Validation

**Objective:** Ensure no regression.

**Files:**
- Test: `v0-earn-buzz/__tests__/referral-vip.test.ts` (optional)

**Steps:**
- `npx tsc --noEmit --skipLibCheck` -> only abouttivexx li error
- Manual flow: Register with referral code -> ref page shows VIP 500 card -> fill 080xxxx, MTN -> Convert -> localStorage vip.redeemed true, card flips to redeemed, referral withdraw min now shows 10,000
- Invite test user, make that test user do 50 taps + time to reach 30 trust -> refer page pending decrements, approved increments.
- `git status` clean, `git log` shows steps.

### Risks / Open Questions

- **Airtime provider:** User says real Paystack on Vercel - Paystack Bills airtime requires B2B approval and bill creation; VTpass is more common for airtime. Plan implements provider-agnostic stub with env switch `AIRTIME_PROVIDER=paystack|vtpass|mock`. Need to confirm which VTpass/shago credentials user has, or if they want Paystack Transfers to buy airtime via mobile money. Offer mock for now, wire real after they supply VTpass apiKey/secret.
- **Supabase schema:** Need columns `users.referral_vip_balance`, `users.trust_score`, `referral_withdraws` table; if missing, code falls back to localStorage and still works but server truth lags. Migration SQL provided in plan appendix.
- **Double spend:** Must enforce VIP once both client and server - check `vip_redeemed` flag before allowing /api/airtime second call (return 400 already redeemed).
- **Existing referral balances** at ₦500 tier: Users with old 5000/10000 balances will see inflated values; migration should not retroactively change history but new referrals are 500. Add note in UI "Referral reward updated to ₦500 per friend approved at Beginner level".
- **Legal:** Airtime conversion is non-refundable; show disclaimer.

### Appendix - Supabase migrations (if needed)

```sql
alter table users add column if not exists referral_vip_balance int default 500;
alter table users add column if not exists vip_redeemed boolean default false;
alter table users add column if not exists trust_score int default 0;
create table if not exists referral_withdraws (id uuid primary key default gen_random_uuid(), user_id text, amount int, type text, status text, created_at timestamptz default now());
```
