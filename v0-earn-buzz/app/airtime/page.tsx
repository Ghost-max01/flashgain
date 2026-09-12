"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaykeyError } from "@/components/paykey-error"

export default function AirtimePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [paykey, setPaykey] = useState("")
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [showPaykeyError, setShowPaykeyError] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyStatus, setBuyStatus] = useState<string | null>(null)

  // No client paykey bypass — server validates. Balance guard disables purchase when insufficient.

  useEffect(() => {
    const storedUser = localStorage.getItem("momo-credit-user")

    if (!storedUser) {
      router.push("/login")
      return
    }

    setUserData(JSON.parse(storedUser))
  }, [router])

  const networks = ["Airtel", "MTN", "Glo", "9mobile"]

  const airtimeAmounts = [
    { amount: 50, cashback: 1 },
    { amount: 100, cashback: 2 },
    { amount: 200, cashback: 3 },
    { amount: 500, cashback: 10 },
    { amount: 1000, cashback: 20 },
    { amount: 2000, cashback: 50 },
    { amount: 3000, cashback: 75 },
    { amount: 5000, cashback: 125 },
    { amount: 10000, cashback: 250 },
  ]

  const addNotification = (title: string, message: string, type: "success" | "info" | "warning" = "success") => {
    const notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
    }

    const existing = localStorage.getItem("momo-credit-notifications")
    const notifications = existing ? JSON.parse(existing) : []
    notifications.unshift(notification)
    localStorage.setItem("momo-credit-notifications", JSON.stringify(notifications))
  }

  const balanceNum = Number(userData?.balance || 0)
  const canAfford = selectedAmount != null && balanceNum >= selectedAmount

  const handleBuyAirtime = async () => {
    if (!selectedNetwork || !phoneNumber || !selectedAmount) {
      setBuyStatus("Please fill all required fields")
      return
    }
    if (!canAfford) {
      setBuyStatus("Insufficient balance")
      return
    }
    setBuying(true)
    setBuyStatus("Sending request...")
    try {
      const uid = userData?.id || userData?.userId || userData?.user_id || ""
      const res = await fetch("/api/airtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, phone: phoneNumber, network: selectedNetwork, amount: selectedAmount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setBuyStatus(data?.error || "Airtime request failed")
        setBuying(false)
        return
      }
      // Status poll for pending provider reference
      const ref = data.reference as string | undefined
      if (ref && (data.status === "pending" || data.status === "accepted")) {
        setBuyStatus("Queued — confirming...")
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 3000))
          try {
            const s = await fetch(`/api/airtime/status?reference=${encodeURIComponent(ref)}`)
            const sj = await s.json().catch(() => ({}))
            if (sj?.success) {
              setBuyStatus(`Status: ${sj.status || "confirmed"}`)
              if (String(sj.status || "").toLowerCase() !== "pending") break
            }
          } catch {}
        }
      } else {
        setBuyStatus(data.message || "Airtime sent")
      }
      router.push("/dashboard")
    } catch (e: any) {
      setBuyStatus(e?.message || "Request failed")
    } finally {
      setBuying(false)
    }
  }

  if (!userData) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen pb-6 bg-white">
      <div className="flex items-center p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Airtime</span>
        </Link>
      </div>

      <div className="bg-orange-600 text-white p-4 flex items-center justify-between">
        <div>
          <span className="font-medium">Enjoy </span>
          <span className="text-yellow-300 font-bold">Airtime Bonuses!</span>
        </div>
        <Button className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold px-6 py-1 h-8 rounded-full">
          GO
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4">
        {networks.map((network) => (
          <button
            key={network}
            className={`p-3 rounded-lg border text-center ${
              selectedNetwork === network ? "border-orange-600 bg-orange-50" : "border-gray-200"
            }`}
            onClick={() => setSelectedNetwork(network)}
          >
            {network}
          </button>
        ))}
      </div>

      <div className="px-4 mb-4">
        <Input
          type="tel"
          placeholder="Enter mobile number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="border rounded-lg p-3"
        />
      </div>

      <div className="px-4 mb-4">
        <h3 className="font-medium mb-2">Select Amount</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {airtimeAmounts.map((option) => (
            <button
              key={option.amount}
              className={`p-3 rounded-lg border text-center ${
                selectedAmount === option.amount ? "border-orange-600 bg-orange-50" : "border-gray-200"
              }`}
              onClick={() => setSelectedAmount(option.amount)}
            >
              <div className="font-bold">₦{option.amount}</div>
              <div className="text-xs text-gray-500">₦{option.cashback} Cashback</div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <Input
          type="text"
          placeholder="Enter Paykey"
          value={paykey}
          onChange={(e) => setPaykey(e.target.value)}
          className="border rounded-lg p-3 mb-4"
        />

        <Button
          onClick={handleBuyAirtime}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 rounded-lg"
          disabled={!selectedAmount || !selectedNetwork || !phoneNumber || !canAfford || buying}
        >
          {buying ? "Processing..." : canAfford ? "Buy Airtime" : "Insufficient balance"}
        </Button>
        {buyStatus && <p className="text-sm text-gray-600 mt-2">{buyStatus}</p>}
      </div>

      {showPaykeyError && <PaykeyError onClose={() => setShowPaykeyError(false)} />}
    </div>
  )
}
