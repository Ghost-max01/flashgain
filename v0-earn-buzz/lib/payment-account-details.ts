export type PaymentAccountUseCase = "default" | "loan" | "momo"

export interface PaymentAccountDetails {
  bankName: string
  accountNumber: string
  accountName: string
}

const ACCOUNT_DETAILS_BY_USE_CASE: Record<PaymentAccountUseCase, PaymentAccountDetails> = {
  default: {
    bankName: "Kuda",
    accountNumber: "2086258173",
    accountName: "Faith Wali",
  },
  loan: {
    bankName: "Kuda",
    accountNumber: "2086258173",
    accountName: "Faith Wali",
  },
  momo: {
    bankName: "Kuda",
    accountNumber: "2086258173",
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
