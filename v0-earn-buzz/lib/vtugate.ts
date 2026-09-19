// ── VTUgate airtime helper (SERVER-ONLY) ──
// Docs: https://vtugate.com/docs — Base URL https://api.vtugate.com
//   POST /api/v1/buyairtime  (form-urlencoded: service_id, phone_number, amount)
// Auth: Bearer VTUGATE_API_KEY. Rate limit 60 req/min.
// Test key = fully mocked (end phone in 1111 to simulate failure).
//
// service_id is per-network. Resolve order:
//   1) explicit env override VTUGATE_<NET>_SERVICE_ID
//   2) live discovery via Fetch (All) Services endpoints (cached in memory)
// Callers must consume/redeem ONLY after buyAirtime returns { ok:true }.

const BASE = "https://api.vtugate.com";

function getKey(): string {
  return (
    process.env.VTUGATE_API_KEY ||
    process.env.VTUGATE_SECRET_KEY ||
    process.env.VTUGATE_SECRET ||
    ""
  ).trim();
}

export function vtugateConfigured(): boolean {
  return getKey().length > 0;
}

function envServiceId(network: string): string {
  const n = network.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const key = `VTUGATE_${n}_SERVICE_ID`;
  return (process.env as any)[key]?.toString().trim() || "";
}

// --- service discovery (cached) ---
let serviceCache: { at: number; map: Record<string, string> } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;
const DISCOVERY_PATHS = [
  "/api/v1/fetchallservices",
  "/api/v1/fetchservices",
  "/api/v1/services",
  "/api/v1/allservices",
];

function norm(s: unknown): string {
  return String(s || "").toLowerCase();
}

function pickServices(payload: any): Record<string, string> {
  const map: Record<string, string> = {};
  try {
    const arr: any[] =
      (Array.isArray(payload?.data) && payload.data) ||
      (Array.isArray(payload?.data?.services) && payload.data.services) ||
      (Array.isArray(payload?.services) && payload.services) ||
      [];
    for (const s of arr) {
      const id = String(s?.service_id ?? s?.id ?? s?.serviceId ?? "").trim();
      if (!id) continue;
      const hay = `${norm(s?.network)} ${norm(s?.name)} ${norm(s?.service_name)} ${norm(s?.type)} ${norm(s?.category)}`;
      const isAirtime =
        hay.includes("airtime") || norm(s?.type) === "airtime" || norm(s?.category) === "airtime";
      if (!isAirtime) continue;
      if (hay.includes("mtn") && !map.MTN) map.MTN = id;
      else if (hay.includes("glo") && !map.GLO) map.GLO = id;
      else if (hay.includes("airtel") && !map.AIRTEL) map.AIRTEL = id;
      else if ((hay.includes("9mobile") || hay.includes("etisalat") || hay.includes("9 mobile")) && !map["9MOBILE"]) map["9MOBILE"] = id;
    }
  } catch {}
  return map;
}

async function discoverServiceIds(key: string): Promise<Record<string, string>> {
  if (serviceCache && Date.now() - serviceCache.at < CACHE_TTL_MS) return serviceCache.map;
  for (const p of DISCOVERY_PATHS) {
    try {
      const res = await fetch(`${BASE}${p}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${key}`,
        },
        body: new URLSearchParams({}),
      });
      const j: any = await res.json().catch(() => null);
      if (!res.ok || !j) continue;
      const map = pickServices(j);
      if (Object.keys(map).length > 0) {
        serviceCache = { at: Date.now(), map };
        return map;
      }
    } catch {}
  }
  return serviceCache?.map || {};
}

export async function resolveServiceId(network: string): Promise<{ id: string; source: "env" | "discovery" } | { error: string }> {
  const net = network.toUpperCase();
  const fromEnv = envServiceId(net);
  if (fromEnv) return { id: fromEnv, source: "env" };
  const key = getKey();
  if (!key) return { error: "VTUgate not configured on server (VTUGATE_API_KEY missing). Add it and redeploy." };
  const map = await discoverServiceIds(key);
  if (map[net]) return { id: map[net], source: "discovery" };
  return {
    error:
      `Could not resolve VTUgate service_id for ${net}. Set VTUGATE_${net.replace(/[^A-Z0-9]/g, "")}_SERVICE_ID in env ` +
      `(find it via Fetch All Services), then redeploy.`,
  };
}

export type VtuAirtimeResult =
  | { ok: true; transactionId: string | number; externalRef: string; network: string; raw: any }
  | { ok: false; error: string; raw?: any };

export async function buyAirtime(opts: {
  phone: string;
  network: string;
  amount: number;
}): Promise<VtuAirtimeResult> {
  const key = getKey();
  if (!key) {
    return { ok: false, error: "VTUgate not configured on server (VTUGATE_API_KEY missing). Add it and redeploy." };
  }
  const digits = String(opts.phone || "").replace(/\D/g, "");
  if (!/^0[789][01][0-9]{8}$/.test(digits)) {
    return { ok: false, error: "Invalid Nigerian phone (11 digits, starts 070/080/081/090)" };
  }
  const amount = Math.floor(Number(opts.amount));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Invalid amount" };

  const resolved: any = await resolveServiceId(opts.network);
  if ((resolved as any).error) return { ok: false, error: (resolved as any).error };
  const service_id = (resolved as any).id as string;

  let res: Response | null = null;
  let j: any = null;
  try {
    res = await fetch(`${BASE}/api/v1/buyairtime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${key}`,
      },
      body: new URLSearchParams({ service_id, phone_number: digits, amount: String(amount) }),
    });
    j = await res.json().catch(() => null);
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error to VTUgate — try again (nothing was deducted)" };
  }
  const data = (j as any)?.data || {};
  // Docs: { status:true, data:{ provider_status:true, transaction_id, external_reference, ... } }
  const providerOk = data.provider_status === true || data.provider_status === "true";
  if (res && res.ok && (j as any)?.status === true && providerOk) {
    return {
      ok: true,
      transactionId: data.transaction_id ?? "",
      externalRef: String(data.external_reference || data.transaction_id || ""),
      network: String(opts.network).toUpperCase(),
      raw: j,
    };
  }
  const msg =
    (j as any)?.message ||
    data?.provider_message ||
    `VTUgate rejected the request (${res?.status || "no response"}) — nothing was deducted`;
  return { ok: false, error: String(msg), raw: j };
}

// Best-effort requery of a transaction_id (Transaction Status endpoint).
const REQUERY_PATHS = [
  "/api/v1/requery",
  "/api/v1/transactionstatus",
  "/api/v1/transaction-status",
  "/api/v1/querystatus",
  "/api/v1/transactions/status",
];

export async function requeryTransaction(transactionId: string | number): Promise<{ found: boolean; ok?: boolean; raw?: any }> {
  const key = getKey();
  if (!key) return { found: false };
  for (const p of REQUERY_PATHS) {
    try {
      const res = await fetch(`${BASE}${p}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${key}`,
        },
        body: new URLSearchParams({ transaction_id: String(transactionId) }),
      });
      const j: any = await res.json().catch(() => null);
      if (!res.ok || !j) continue;
      const data = j?.data || j;
      const txt = JSON.stringify(data).toLowerCase();
      if (/(success|delivered|completed|successful)/.test(txt)) return { found: true, ok: true, raw: j };
      if (/(fail|error|reversed|refund)/.test(txt)) return { found: true, ok: false, raw: j };
      return { found: true, raw: j };
    } catch {}
  }
  return { found: false };
}
