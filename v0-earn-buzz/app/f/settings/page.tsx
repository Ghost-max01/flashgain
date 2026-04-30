"use client"

import { useState, useEffect } from "react"
import { Settings, ArrowLeft, Save, BarChart3, Bell, Lock, Zap, CheckCircle } from "lucide-react"
import Link from "next/link"

interface SystemSettings {
  platformName: string
  maintenanceMode: boolean
  maxTasksPerDay: number
  baseRewardAmount: number
  notificationsEnabled: boolean
  apiRateLimit: number
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    platformName: "FlashGain",
    maintenanceMode: false,
    maxTasksPerDay: 100,
    baseRewardAmount: 5000,
    notificationsEnabled: true,
    apiRateLimit: 1000,
  })

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("admin-settings")
    if (saved) {
      setSettings(JSON.parse(saved))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem("admin-settings", JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChange = (key: keyof SystemSettings, value: any) => {
    setSettings({ ...settings, [key]: value })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/f">
            <button className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8 text-purple-400" />
              System Settings
            </h1>
            <p className="text-slate-400">Configure platform behavior</p>
          </div>
        </div>

        {/* Save Notification */}
        {saved && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Settings saved successfully!
          </div>
        )}
      </div>

      {/* Settings Sections */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* General Settings */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            General Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Platform Name</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => handleChange("platformName", e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Base Reward Amount (₦)</label>
              <input
                type="number"
                value={settings.baseRewardAmount}
                onChange={(e) => handleChange("baseRewardAmount", parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
              />
              <p className="text-xs text-slate-500 mt-1">Default amount awarded to users per completed task</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Max Tasks Per Day</label>
              <input
                type="number"
                value={settings.maxTasksPerDay}
                onChange={(e) => handleChange("maxTasksPerDay", parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
              />
              <p className="text-xs text-slate-500 mt-1">Maximum tasks a user can complete per day</p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-400" />
            Security & Performance
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">API Rate Limit (requests/min)</label>
              <input
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) => handleChange("apiRateLimit", parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-red-400"
              />
              <p className="text-xs text-slate-500 mt-1">Maximum API requests per minute per user</p>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Maintenance Mode</label>
                  <p className="text-xs text-slate-500">Disable platform access during updates</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleChange("maintenanceMode", e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    settings.maintenanceMode
                      ? "bg-red-500/20 text-red-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {settings.maintenanceMode ? "ON" : "OFF"}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            Notifications
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Enable Notifications</label>
                <p className="text-xs text-slate-500">Send notifications to users on task completion</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => handleChange("notificationsEnabled", e.target.checked)}
                  className="w-5 h-5"
                />
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  settings.notificationsEnabled
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-500/20 text-slate-400"
                }`}>
                  {settings.notificationsEnabled ? "ON" : "OFF"}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Dangerous Actions */}
        <div className="bg-red-950/20 backdrop-blur border border-red-900/50 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400">
            <Zap className="h-5 w-5" />
            Dangerous Actions
          </h2>

          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg transition text-white font-semibold">
              Clear All Logs
            </button>
            <button className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg transition text-white font-semibold">
              Reset All User Data
            </button>
            <button className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg transition text-white font-semibold">
              Ban All Inactive Users
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition"
          >
            <Save className="h-5 w-5" />
            Save Settings
          </button>
          <Link href="/f" className="flex-1">
            <button className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition">
              Cancel
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
