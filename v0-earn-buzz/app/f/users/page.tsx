"use client"

import { useState, useEffect } from "react"
import { Users, Settings, LogOut, ArrowLeft, Search, Ban, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  name: string
  balance: number
  tasksCompleted: number
  lastLogin: string
  created_at?: string
  status: "active" | "inactive" | "banned"
  referral_balance?: number
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "banned">("all")
  const [loading, setLoading] = useState(false)
  const [newUsersThisWeek, setNewUsersThisWeek] = useState(0)
  const [totalActiveUsers, setTotalActiveUsers] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)

    try {
      if (supabase) {
        const { data: usersData, error } = await supabase
          .from("users")
          .select("*")
          .limit(1000)

        if (!error && usersData) {
          const processedUsers: User[] = usersData.map((user: any) => {
            // Determine status based on last login and activity
            const lastLoginDate = new Date(user.lastLogin || user.created_at || "")
            const daysSinceLogin = (Date.now() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)
            
            let status: "active" | "inactive" | "banned" = "active"
            if (user.status === "banned") status = "banned"
            else if (daysSinceLogin > 30) status = "inactive"

            return {
              id: user.id || user.userId,
              email: user.email,
              name: user.name || "User",
              balance: Number(user.balance || 0),
              tasksCompleted: Number(user.tasksCompleted || 0),
              lastLogin: user.lastLogin || user.created_at || new Date().toISOString(),
              created_at: user.created_at || new Date().toISOString(),
              status,
              referral_balance: Number(user.referral_balance || 0),
            }
          })

          setUsers(processedUsers)

          // Calculate stats
          const activeCount = processedUsers.filter(u => u.status === "active").length
          setTotalActiveUsers(activeCount)
          setTotalTasks(processedUsers.reduce((sum, u) => sum + u.tasksCompleted, 0))
          setTotalBalance(processedUsers.reduce((sum, u) => sum + u.balance, 0))

          // Count new users from past 7 days
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const newUsersCount = processedUsers.filter(u => {
            const createdDate = new Date(u.created_at || 0)
            return createdDate >= sevenDaysAgo
          }).length
          setNewUsersThisWeek(newUsersCount)
        }
      }
    } catch (error) {
      console.error("Error loading users:", error)
    }
    setLoading(false)
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || user.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleBanUser = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, status: "banned" as const } : user
      )
    )
  }

  const handleActivateUser = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, status: "active" as const } : user
      )
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-400 bg-emerald-400/10"
      case "inactive":
        return "text-amber-400 bg-amber-400/10"
      case "banned":
        return "text-red-400 bg-red-400/10"
      default:
        return "text-slate-400"
    }
  }

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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-400" />
              User Management
            </h1>
            <p className="text-slate-400">Monitor and manage user accounts</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Users</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{users.length}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Active Users</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{totalActiveUsers}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">New Users (7 days)</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{newUsersThisWeek}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Tasks</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{totalTasks}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Balance</p>
            <p className="text-xl font-bold text-amber-400 mt-1">
              ₦{(totalBalance / 1000000).toFixed(1)}M
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-400"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              <p className="mt-4 text-slate-400">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-700/30">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">User</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Balance</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Tasks</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Last Login</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/20 transition">
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{user.email}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-400">
                        ₦{user.balance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{user.tasksCompleted}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(user.lastLogin).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(user.status)}`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {user.status === "banned" ? (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              className="p-2 hover:bg-slate-600 rounded-lg transition text-emerald-400"
                              title="Activate"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanUser(user.id)}
                              className="p-2 hover:bg-slate-600 rounded-lg transition text-red-400"
                              title="Ban"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-slate-400">No users found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
