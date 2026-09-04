"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Transaction {
  id: number
  type: "credit"
  category: "claim" | "task" | "signup" | "referral" | "other"
  description: string
  amount: number
  date: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx-user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    const user = JSON.parse(storedUser)
    setUserData(user)

    // Load existing transactions
    let txs: Transaction[] = []
    const storedTransactions = localStorage.getItem("tivexx-transactions")
    if (storedTransactions) txs = JSON.parse(storedTransactions)

    // ✅ Ensure the signup bonus (₦5,000) exists exactly once at the bottom
    const hasSignupBonus = txs.some((tx) => tx.category === "signup" && tx.amount === 5000)
    if (!hasSignupBonus) {
      const signupDate =
        user.created_at ||
        user.signup_date ||
        new Date().toISOString() // fallback if no date stored

      const signupBonus: Transaction = {
        id: Date.now(),
        type: "credit",
        category: "signup",
        description: "Signup Bonus",
        amount: 5000,
        date: signupDate,
      }

      // Add signup bonus as the oldest (bottom)
      txs = [...txs, signupBonus]
      localStorage.setItem("tivexx-transactions", JSON.stringify(txs))
    }

    // ✅ Add missing referral transactions if they exist in user data
    if (user.referral_count && user.referral_count > 0) {
      const existingReferralCount = txs.filter((tx) => tx.category === "referral").length
      const missingReferrals = user.referral_count - existingReferralCount

      if (missingReferrals > 0) {
        const newReferralTxs: Transaction[] = []
        for (let i = 0; i < missingReferrals; i++) {
          newReferralTxs.push({
            id: Date.now() + i,
            type: "credit",
            category: "referral",
            description: "Referral Bonus",
            amount: 10000,
            date: new Date().toISOString(),
          })
        }
        txs = [...newReferralTxs, ...txs] // add new ones on top
        localStorage.setItem("tivexx-transactions", JSON.stringify(txs))
      }
    }

    // ✅ Sort so that signup bonus is always at bottom (oldest)
    txs.sort((a, b) => {
      if (a.category === "signup") return -1
      if (b.category === "signup") return 1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    setTransactions(txs)
  }, [router])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace("NGN", "₦")

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const handleClearHistory = () => setShowConfirmClear(true)

  const confirmClearHistory = () => {
    // ✅ When clearing, restore signup bonus
    const user = userData
    const signupDate =
      user?.created_at || user?.signup_date || new Date().toISOString()
    const signupBonus: Transaction = {
      id: Date.now(),
      type: "credit",
      category: "signup",
      description: "Signup Bonus",
      amount: 5000,
      date: signupDate,
    }
    const newTxs = [signupBonus]
    localStorage.setItem("tivexx-transactions", JSON.stringify(newTxs))
    setTransactions(newTxs)
    setShowConfirmClear(false)
  }

  const cancelClearHistory = () => setShowConfirmClear(false)

  if (!userData) return <div className="p-6 text-center text-white">Loading...</div>

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const totalTransactions = transactions.length

  const getColorClasses = (category: Transaction["category"]) => {
    switch (category) {
      case "claim":
        return "bg-blue-900/30 text-blue-300 border-blue-800/30"
      case "task":
        return "bg-purple-900/30 text-purple-300 border-purple-800/30"
      case "signup":
        return "bg-amber-900/30 text-amber-300 border-amber-800/30"
      case "referral":
        return "bg-emerald-900/30 text-emerald-300 border-emerald-800/30"
      default:
        return "bg-white/10 text-white border-white/20"
    }
  }

  return (
    <div className="min-h-screen pb-6 bg-gradient-to-br from-green-700 via-green-900 to-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/8 bg-white/6">
        <Link href="/dashboard" className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Transaction History</span>
        </Link>
        {transactions.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-300 hover:text-red-200 hover:bg-red-900/30"
            onClick={handleClearHistory}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Totals */}
      <div className="p-4 border-b border-white/8 bg-white/6 flex justify-between items-center">
        <div></div>
        <div>
          <p className="text-sm text-white/60">Transactions</p>
          <p className="text-lg font-bold text-white">{totalTransactions}</p>
        </div>
      </div>

      {/* History List */}
      <div className="p-4">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-white/60">No transactions yet</div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`flex items-center justify-between p-3 border rounded-lg backdrop-blur-lg transform transition duration-200 hover:scale-[1.02] ${getColorClasses(
                  transaction.category
                )}`}
              >
                <div className="flex flex-col">
                  <div className="text-sm font-semibold">{transaction.description}</div>
                  <div className="text-xs opacity-70">{formatDate(transaction.date)}</div>
                </div>
                <div className="text-sm font-bold text-emerald-300">+{formatCurrency(transaction.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Clear History</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to clear your transaction history? Signup bonus will remain.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelClearHistory}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmClearHistory}>
                Clear History
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
