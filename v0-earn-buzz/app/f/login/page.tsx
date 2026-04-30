"use client"

import { useState, useEffect } from "react"
import { Mail, Lock, Eye, EyeOff, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

const ADMIN_EMAIL = "Oladunnilawal400@gmail.com"
const ADMIN_PASSWORD = "@Oladunni6020"

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if already logged in
    const adminSession = localStorage.getItem("admin-session")
    if (adminSession) {
      router.push("/f")
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Set admin session
      localStorage.setItem(
        "admin-session",
        JSON.stringify({
          email: ADMIN_EMAIL,
          loginTime: new Date().toISOString(),
          sessionId: `admin-${Date.now()}`,
        })
      )

      // Log admin login
      const logs = JSON.parse(localStorage.getItem("admin-logs") || "[]")
      logs.push({
        type: "admin_login",
        email: ADMIN_EMAIL,
        timestamp: new Date().toISOString(),
        date: new Date().toDateString(),
      })
      localStorage.setItem("admin-logs", JSON.stringify(logs))

      // Track session in database
      try {
        await fetch("/api/track-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: ADMIN_EMAIL,
            action: "admin_login",
            adminSession: true,
          }),
        })
      } catch (err) {
        console.error("Failed to track session:", err)
      }

      router.push("/f")
    } else {
      setError("Invalid email or password")
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-400 to-blue-400 rounded-xl">
                <Zap className="h-6 w-6 text-slate-900" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-slate-400 text-sm">Access system control and analytics</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-10 pr-10 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Logging in...
                </div>
              ) : (
                "Login to Admin Panel"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800/50 text-slate-500">Security</span>
            </div>
          </div>

          {/* Security Info */}
          <div className="bg-slate-700/30 rounded-lg p-4 text-xs text-slate-400 space-y-2">
            <p>• This panel is restricted to administrators only</p>
            <p>• All access is logged and monitored</p>
            <p>• Do not share your credentials with anyone</p>
            <p>• Sessions expire after 24 hours of inactivity</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-slate-400 text-sm">
          <p>FlashGain Admin Dashboard v1.0</p>
        </div>
      </div>
    </div>
  )
}
