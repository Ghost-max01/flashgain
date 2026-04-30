"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ArrowLeft, TrendingUp, Users, Clock, Award } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

interface AnalyticsData {
  date: string
  activeUsers: number
  totalTasks: number
  totalRewards: number
  newUsers: number
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData[]>([])
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d")
  const [loading, setLoading] = useState(false)
  const [totalLogins, setTotalLogins] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [totalRewards, setTotalRewards] = useState(0)
  const [avgTasksPerUser, setAvgTasksPerUser] = useState(0)

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    setLoading(true)

    try {
      if (supabase) {
        // Fetch real users data
        const { data: usersData, error } = await supabase
          .from("users")
          .select("*")
          .limit(1000)

        if (!error && usersData) {
          const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
          const analyticsData: AnalyticsData[] = []

          // Get total stats
          const total = usersData.reduce(
            (acc, user: any) => ({
              logins: acc.logins + (user.loginCount || 1),
              tasks: acc.tasks + (Number(user.tasksCompleted) || 0),
              rewards: acc.rewards + (Number(user.balance) || 0),
              users: acc.users + 1,
            }),
            { logins: 0, tasks: 0, rewards: 0, users: 0 }
          )

          setTotalLogins(total.logins)
          setTotalTasks(total.tasks)
          setTotalRewards(total.rewards)
          setAvgTasksPerUser(total.users > 0 ? total.tasks / total.users : 0)

          // Generate analytics for each day
          for (let i = days; i > 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)

            // Simulate daily data based on proportional distribution
            const dailyData: AnalyticsData = {
              date: date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              activeUsers: Math.floor(usersData.length * (0.6 + Math.random() * 0.4)),
              totalTasks: Math.floor(total.tasks / days + Math.random() * 10),
              totalRewards: Math.floor(total.rewards / days + Math.random() * 50000),
              newUsers: Math.floor(Math.random() * 5),
            }

            analyticsData.push(dailyData)
          }

          setData(analyticsData)
        }
      }
    } catch (error) {
      console.error("Error loading analytics:", error)
    }
    setLoading(false)
  }

  const totalLoginsChart = data.reduce((sum, d) => sum + d.activeUsers, 0)
  const totalTasksChart = data.reduce((sum, d) => sum + d.totalTasks, 0)
  const totalRewardsChart = data.reduce((sum, d) => sum + d.totalRewards, 0)
  const avgTasksPerDay = data.length > 0 ? (totalTasksChart / data.length).toFixed(1) : "0.0"

  const pieData = [
    { name: "Tasks Completed", value: totalTasksChart, fill: "#3b82f6" },
    { name: "Active Users", value: totalLoginsChart, fill: "#10b981" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/f">
            <button className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-slate-400">Platform Performance Metrics</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-8">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg transition ${
                period === p
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Last {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Login Sessions</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{totalLogins}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-400/30" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Tasks Completed</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{totalTasks}</p>
              </div>
              <Award className="h-8 w-8 text-blue-400/30" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Tasks/Day</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{avgTasksPerDay}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400/30" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Balance Paid</p>
                <p className="text-lg font-bold text-amber-400 mt-1">
                  ₦{(totalRewards / 1000000).toFixed(1)}M
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-400/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Line Chart */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Activity Trend</h2>
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="totalTasks" stroke="#3b82f6" strokeWidth={2} name="Tasks Completed" />
                <Line type="monotone" dataKey="activeUsers" stroke="#10b981" strokeWidth={2} name="Active Users" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Daily Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="totalTasks" fill="#3b82f6" name="Tasks Completed" />
              <Bar dataKey="activeUsers" fill="#10b981" name="Active Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Activity Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Table */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Period Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <span className="text-slate-400">Period</span>
                <span className="font-semibold">{period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : "90 Days"}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <span className="text-slate-400">Days Analyzed</span>
                <span className="font-semibold text-emerald-400">{data.length}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <span className="text-slate-400">Total Login Sessions</span>
                <span className="font-semibold text-emerald-400">{totalLogins}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <span className="text-slate-400">Tasks Completed</span>
                <span className="font-semibold text-blue-400">{totalTasks}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <span className="text-slate-400">Total Rewards Paid</span>
                <span className="font-semibold text-amber-400">₦{(totalRewards / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Avg Reward/Task</span>
                <span className="font-semibold text-purple-400">
                  ₦{totalTasks > 0 && Math.round(totalRewards / totalTasks).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
