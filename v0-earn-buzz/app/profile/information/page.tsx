"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User, Mail, Award, CheckCircle, Copy } from "lucide-react" // Added Copy
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast" // Import useToast

interface UserData {
  name: string
  email: string
  balance: number
  weeklyRewards: number
  hasMomoNumber: boolean
  profilePicture?: string
  level?: string
  userId: string // Added userId
}

export default function ProfileInformationPage() {
  const router = useRouter()
  const { toast } = useToast() // Initialize useToast
  const [userData, setUserData] = useState<UserData | null>(null)
  const [editName, setEditName] = useState("")
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    // Check if user is logged in — real stored user, not mock.
    const storedUser = localStorage.getItem("tivexx-user")

    if (!storedUser) {
      router.push("/login")
      return
    }

    const user = JSON.parse(storedUser)
    // Re-attach persisted picture (survives reloads unless storage cleared).
    import("@/lib/session-client").then((s) => {
      try {
        const kept = (s as any).getPersistedProfilePicture?.(user)
        if (kept && !user.profilePicture) {
          user.profilePicture = kept
          try { localStorage.setItem("tivexx-user", JSON.stringify(user)) } catch {}
          setUserData({ ...user })
        }
      } catch {}
    }).catch(() => {})
    // Set default level if not present
    if (!user.level) {
      user.level = "Basic"
    }
    // Ensure userId is stable per user
    if (!user.userId) {
      user.userId = user.referral_code || user.referralCode || user.id || ""
      localStorage.setItem("tivexx-user", JSON.stringify(user))
    }

    setUserData(user)
    setEditName(String(user.name || ""))
    // Live-sync avatar/name changes from dashboard/profile tabs.
    let unsub: (() => void) | undefined
    import("@/lib/profile-picture").then((m) => {
      try {
        unsub = m.subscribeToUserUpdates((u: any) => {
          if (!u) return
          setUserData((prev) => ({ ...((prev || {}) as UserData), ...u }) as UserData)
        })
      } catch {}
    }).catch(() => {})
    return () => { try { unsub?.() } catch {} }
  }, [router])

  const handleCopyUserId = () => {
    if (userData?.userId) {
      navigator.clipboard.writeText(userData.userId)
      toast({
        title: "Copied!",
        description: "User ID copied to clipboard.",
      })
    }
  }

  const handleSaveName = async () => {
    const clean = editName.trim()
    if (!clean || !userData) return
    if (clean === userData.name) return
    setSavingName(true)
    try {
      const m = await import("@/lib/profile-picture")
      const updated = { ...userData, name: clean }
      m.saveStoredUser(updated)
      setUserData(updated)
      toast({ title: "Saved", description: "Your name was updated everywhere." })
    } catch {
      toast({ title: "Failed", description: "Could not save name. Try again." })
    } finally {
      setSavingName(false)
    }
  }

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { e.target.value = "" } catch {}
    try {
      const m = await import("@/lib/profile-picture")
      const res = await m.saveProfilePictureFromFile(file)
      if (res.ok && res.dataUrl) {
        setUserData((prev) => (prev ? ({ ...prev, profilePicture: res.dataUrl } as UserData) : prev))
        toast({ title: "Profile updated", description: "Your photo was saved and synced." })
      } else {
        toast({ title: "Upload failed", description: "Pick a smaller image and try again." })
      }
    } catch {
      toast({ title: "Upload failed", description: "Pick a valid image and try again." })
    }
  }

  if (!userData) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5f0] to-[#fff0e6] pb-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="font-bold text-lg">Profile Information</div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-md mx-auto mt-6 px-4">
        {/* Profile Picture — real stored photo, tap to change */}
        <div className="flex flex-col items-center mb-8">
          <label className="w-24 h-24 rounded-full overflow-hidden border-2 border-orange-500 mb-2 cursor-pointer relative block">
            {userData.profilePicture ? (
              <img
                src={userData.profilePicture || "/placeholder.svg"}
                alt={userData.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                <User className="h-12 w-12 text-orange-500" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleAvatarFile} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Change profile picture" />
          </label>
          <h2 className="text-xl font-bold text-gray-800">{userData.name}</h2>
          <p className="text-xs text-gray-400 mt-1">Tap photo to change • shows in dashboard + profile</p>
        </div>

        {/* Edit name — wired to real stored user */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Edit details</h3>
          <label className="text-sm text-gray-500">Full name</label>
          <div className="flex gap-2 mt-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={60}
              placeholder="Your name"
              className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400"
            />
            <Button onClick={handleSaveName} disabled={savingName || !editName.trim() || editName.trim() === userData.name} className="rounded-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold px-5">
              {savingName ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {/* User Information Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Account Information</h3>

          <div className="space-y-4">
            {/* Name */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mt-1">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-800">{userData.name}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-800">{userData.email}</p>
              </div>
            </div>

            {/* Account Level */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mt-1">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Level</p>
                <p className="font-medium text-gray-800">{userData.level || "Basic"}</p>
              </div>
            </div>

            {/* User ID */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-gray-600"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">User ID</p>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-800">{userData.userId}</p>
                  <Button variant="ghost" size="icon" onClick={handleCopyUserId} className="h-8 w-8">
                    <Copy className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-tiv-4 flex items-center justify-center mt-1">
                <CheckCircle className="h-5 w-5 text-tiv-2" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Status</p>
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-tiv-2 mr-2"></span>
                  <p className="font-medium text-gray-800">Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
