export type PaymentAccountUseCase = "default" | "loan" | "momo"

export interface PaymentAccountDetails {
  bankName: string
  accountNumber: string
  accountName: string
}

const ACCOUNT_DETAILS_BY_USE_CASE: Record<PaymentAccountUseCase, PaymentAccountDetails> = {
  default: {
    bankName: "VFD MFB",
    accountNumber: "1047207121",
    accountName: "Faith Wali",
  },
  loan: {
    bankName: "VFD MFB",
    accountNumber: "1047207121",
    accountName: "Faith Wali",
  },
  momo: {
    bankName: "VFD MFB",
    accountNumber: "1047207121",
    accountName: "Faith Wali",
  },
}

export function getPaymentAccountDetails(options?: {
  useCase?: PaymentAccountUseCase
  selectedBankName?: string
}): PaymentAccountDetails {
  const useCase = options?.useCase || "default"
  const base = ACCOUNT_DETAILS_BY_USE_CASE[useCase]

  return {
    ...base,
    bankName: options?.selectedBankName?.trim() || base.bankName,
  }
}

export function getAllPaymentAccountDetails() {
  return ACCOUNT_DETAILS_BY_USE_CASE
}
