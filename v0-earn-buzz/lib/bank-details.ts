// Shared bank-details persistence — locked after first save
// Used by setup-bank (post-signup) and withdraw pages
export const BANK_DETAILS_KEY = "tivexx-bank-details"

export type BankDetails = {
  bank: string
  bankCode: string
  accountNumber: string
  accountName: string
  locked: boolean
}

export function getBankDetails(): BankDetails | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(BANK_DETAILS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BankDetails
    if (!parsed?.bank || !parsed?.accountNumber) return null
    return parsed
  } catch {
    return null
  }
}

export function saveBankDetails(details: Omit<BankDetails, "locked"> & { locked?: boolean }): BankDetails {
  const toSave: BankDetails = {
    bank: details.bank,
    bankCode: details.bankCode,
    accountNumber: details.accountNumber,
    accountName: details.accountName,
    locked: true,
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(BANK_DETAILS_KEY, JSON.stringify(toSave))
    // also embed into tivexx-user for convenience
    try {
      const userRaw = localStorage.getItem("tivexx-user")
      if (userRaw) {
        const user = JSON.parse(userRaw)
        user.bankDetails = toSave
        user.bankLocked = true
        localStorage.setItem("tivexx-user", JSON.stringify(user))
      }
    } catch {}
  }
  return toSave
}

export function isBankLocked(): boolean {
  const details = getBankDetails()
  return !!details?.locked
}

export function isBankDetailsComplete(d: BankDetails | null): boolean {
  if (!d) return false
  return Boolean(d.bank && d.bankCode && d.accountNumber && d.accountName)
}

// Verify localStorage cache against server truth. Returns verified only when
// server says verified OR /api/verify-account success; validates bankCode/accountName presence.
export async function verifyBankDetailsServer(userId: string): Promise<{ verified: boolean; unverified?: boolean; reason?: string }> {
  try {
    const local = getBankDetails()
    if (!local || !isBankDetailsComplete(local)) return { verified: false, reason: "incomplete-local" }
    const res = await fetch(`/api/banks/verify-saved?userId=${encodeURIComponent(userId)}`, { cache: "no-store" })
    const j = await res.json().catch(() => ({}))
    if (j?.verified === true) return { verified: true }
    if (j?.unverified === true) return { verified: false, unverified: true, reason: "unverified" }
    // Fallback: try /api/verify-account success
    try {
      const v = await fetch("/api/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode: local.bankCode, accountNumber: local.accountNumber }),
      })
      const vj = await v.json().catch(() => ({}))
      if (v.ok && (vj?.accountName || vj?.verified)) return { verified: true }
    } catch {}
    return { verified: false, reason: "server-denied" }
  } catch {
    return { verified: false, reason: "error" }
  }
}
