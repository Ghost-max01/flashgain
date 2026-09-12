"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Key, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase/client"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx-user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    setUserData(JSON.parse(storedUser))
  }, [router])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters long." })
      return
    }

    if (newPassword !== confirmNewPassword) {
      setMessage({ type: "error", text: "New passwords do not match." })
      return
    }

    setIsLoading(true)
    try {
      const email = userData?.email
      if (!email) {
        setMessage({ type: "error", text: "User not found. Please log in again." })
        setIsLoading(false)
        return
      }

      // 1. Verify current password via Supabase Auth
      if (!supabase) {
        setMessage({ type: "error", text: "Database connection not available." })
        setIsLoading(false)
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (signInError) {
        setMessage({ type: "error", text: "Current password is incorrect." })
        setIsLoading(false)
        return
      }

      // 2. Update Supabase Auth password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setMessage({ type: "error", text: updateError.message })
        setIsLoading(false)
        return
      }

      // 3. Update users.password_hash/salt server-side (verifies old hash, enforces min 8)
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData?.id,
          email,
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error || "Failed to update password." })
        setIsLoading(false)
        return
      }

      setMessage({ type: "success", text: "Password changed successfully!" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch {
      setMessage({ type: "error", text: "Failed to update password. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  if (!userData) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5f0] to-[#fff0e6] pb-6">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="font-bold text-lg">Change Password</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto mt-6 px-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Update Your Password</h2>

          {message && (
            <Alert
              variant={message.type === "success" ? "default" : "destructive"}
              className={`mb-4 ${message.type === "success" ? "bg-tiv-4 border-tiv-4 text-tiv-2" : "bg-red-50 border-red-200 text-red-800"}`}
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <Label htmlFor="current-password" className="flex items-center gap-2 text-gray-700 mb-2">
                <Lock className="h-4 w-4" /> Current Password
              </Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-12 text-base"
                required
              />
            </div>

            <div>
              <Label htmlFor="new-password" className="flex items-center gap-2 text-gray-700 mb-2">
                <Key className="h-4 w-4" /> New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                className="h-12 text-base"
                required
                minLength={8}
              />
            </div>

            <div>
              <Label htmlFor="confirm-new-password" className="flex items-center gap-2 text-gray-700 mb-2">
                <Key className="h-4 w-4" /> Confirm New Password
              </Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-12 text-base"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
