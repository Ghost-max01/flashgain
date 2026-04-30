"use client"

import { useState, useEffect } from "react"
import { Calendar, Users, CheckCircle2, TrendingUp, BarChart3, Download, ArrowLeft, LineChart, Settings } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

interface DailyStats {
  date: string
  uniqueLogins: number
  tasksCompleted: number
  usersActive: string[]
  tasksList: Array<{
    userId: string
    taskId: string
    taskName: string
    reward: number
    completedAt: string
  }>
}

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [loading, setLoading] = useState(false)
  const [allTimeLogs, setAllTimeLogs] = useState<any[]>([])
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  // Track login on mount
  useEffect(() => {
    logAdminAccess()
  }, [])

  // Load stats when date changes
  useEffect(() => {
    loadDailyStats()
    loadOverallStats()
  }, [selectedDate])

  const logAdminAccess = async () => {
    const adminId = localStorage.getItem("admin-id") || `admin-${Date.now()}`
    localStorage.setItem("admin-id", adminId)

    // Log to local storage for now
    const logs = JSON.parse(localStorage.getItem("admin-logs") || "[]")
    logs.push({
      type: "admin_login",
      adminId,
      timestamp: new Date().toISOString(),
      date: new Date().toDateString(),
    })
    localStorage.setItem("admin-logs", JSON.stringify(logs))
  }

  const loadDailyStats = async () => {
    setLoading(true)
    const dateStr = selectedDate.toDateString()

    // Get from localStorage (task completions)
    const completedTasks = JSON.parse(
      localStorage.getItem("tivexx-completed-tasks") || "[]"
    )
    const cooldowns = JSON.parse(
      localStorage.getItem("tivexx-task-cooldowns") || "{}"
    )

    // Get all stored logs
    const logs = JSON.parse(localStorage.getItem("admin-logs") || "[]")
    const dayLogs = logs.filter(
      (log: any) => log.date === dateStr && log.type === "user_login"
    )

    const stats: DailyStats = {
      date: dateStr,
      uniqueLogins: new Set(dayLogs.map((log: any) => log.userId)).size,
      tasksCompleted: Object.keys(cooldowns).length,
      usersActive: Array.from(
        new Set(dayLogs.map((log: any) => log.userId))
      ),
      tasksList: completedTasks.map((taskId: string) => ({
        userId: "user-data",
        taskId,
        taskName: taskId.substring(0, 30),
        reward: 5000,
        completedAt: new Date().toISOString(),
      })),
    }

    setDailyStats(stats)
    setLoading(false)
  }

  const loadOverallStats = async () => {
    // Get unique users from localStorage
    const user = localStorage.getItem("tivexx-user")
    const completedTasks = JSON.parse(
      localStorage.getItem("tivexx-completed-tasks") || "[]"
    )
    const logs = JSON.parse(localStorage.getItem("admin-logs") || "[]")

    const uniqueUsers = new Set(logs.map((log: any) => log.userId))
    setTotalUsers(uniqueUsers.size)
    setTotalTasks(completedTasks.length)
    setAllTimeLogs(logs)
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const handleNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const exportData = () => {
    const data = JSON.stringify(
      {
        totalUsers,
        totalTasks,
        dailyStats,
        allTimeLogs,
      },
      null,
      2
    )
    const element = document.createElement("a")
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(data)
    )
    element.setAttribute("download", `admin-data-${formatDate(selectedDate)}.json`)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-slate-700 rounded-lg transition">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-400">System Analytics & Monitoring</p>
            </div>
          </div>
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/f/analytics">
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-400/10 border border-blue-500/30 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/20 transition cursor-pointer">
              <LineChart className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="font-bold text-white mb-1">Analytics</h3>
              <p className="text-sm text-slate-400">View performance metrics</p>
            </div>
          </Link>

          <Link href="/f/users">
            <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-400/10 border border-emerald-500/30 rounded-xl p-6 hover:shadow-lg hover:shadow-emerald-500/20 transition cursor-pointer">
              <Users className="h-8 w-8 text-emerald-400 mb-3" />
              <h3 className="font-bold text-white mb-1">User Management</h3>
              <p className="text-sm text-slate-400">Manage user accounts</p>
            </div>
          </Link>

          <Link href="/f/settings">
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-400/10 border border-purple-500/30 rounded-xl p-6 hover:shadow-lg hover:shadow-purple-500/20 transition cursor-pointer">
              <Settings className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="font-bold text-white mb-1">Settings</h3>
              <p className="text-sm text-slate-400">Configure system</p>
            </div>
          </Link>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold text-emerald-400">{totalUsers}</p>
              </div>
              <Users className="h-12 w-12 text-emerald-400/30" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Tasks Completed</p>
                <p className="text-3xl font-bold text-blue-400">{totalTasks}</p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-blue-400/30" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Avg Tasks/User</p>
                <p className="text-3xl font-bold text-amber-400">
                  {totalUsers > 0 ? (totalTasks / totalUsers).toFixed(2) : 0}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-amber-400/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              <span className="text-lg font-semibold">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrevDay}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              >
                ← Prev
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
              >
                Today
              </button>
              <button
                onClick={handleNextDay}
                disabled={selectedDate.toDateString() === new Date().toDateString()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>

            <input
              type="date"
              value={formatDate(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
            <p className="mt-4 text-slate-400">Loading data...</p>
          </div>
        ) : dailyStats ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Overview */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Daily Overview
                </h2>

                <div className="space-y-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Unique Logins</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {dailyStats.uniqueLogins}
                    </p>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Tasks Completed</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">
                      {dailyStats.tasksCompleted}
                    </p>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Active Users</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">
                      {dailyStats.usersActive.length}
                    </p>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Total Reward</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">
                      ₦{(dailyStats.tasksCompleted * 5000).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Completed */}
            <div className="lg:col-span-2">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Tasks Completed ({dailyStats.tasksList.length})
                </h2>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dailyStats.tasksList.length > 0 ? (
                    dailyStats.tasksList.map((task, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 flex items-center justify-between hover:bg-slate-700/50 transition"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-white">{task.taskName}</p>
                          <p className="text-sm text-slate-400">ID: {task.taskId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-bold">
                            ₦{task.reward.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(task.completedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-8">
                      No tasks completed on this date
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Historical Data */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Activity History</h2>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allTimeLogs.length > 0 ? (
              allTimeLogs
                .slice()
                .reverse()
                .slice(0, 20)
                .map((log, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-700/30 border border-slate-600 rounded-lg p-3 flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="text-slate-300 font-medium">
                        {log.type === "admin_login" ? "🔐 Admin Login" : "👤 User Login"}
                      </span>
                      <p className="text-slate-500 text-xs">ID: {log.adminId || log.userId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-slate-400 text-center py-4">No activity logs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
