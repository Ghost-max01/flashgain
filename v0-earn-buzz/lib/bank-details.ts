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
