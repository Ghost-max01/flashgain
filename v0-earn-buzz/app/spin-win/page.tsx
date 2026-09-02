"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SpinWinRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/stake#spin") }, [router])
  return (
    <div className="hh-root min-h-screen flex items-center justify-center">
      <p className="text-white/60 text-sm">Spin & Win is now inside <Link href="/stake" className="text-amber-300 font-black">Stake & Win</Link> — redirecting…</p>
    </div>
  )
}
