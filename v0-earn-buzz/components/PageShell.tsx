"use client"

import React from "react"
import { usePathname } from "next/navigation"

type PageShellProps = {
  children: React.ReactNode
  exclude?: string[]
}

export default function PageShell({ children, exclude = [] }: PageShellProps) {
  const pathname = usePathname?.() || ""
  if (exclude.some((p) => pathname.startsWith(p))) return <>{children}</>

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-black" style={{ background: "#050d14" }}>
      {/* Base gradient: NEW brand base (dark). */}
      {/* OLD OLD COLOR (pre-rebrand green flash) — commented out, do not re-enable:
          <div ... style={{ background: 'linear-gradient(135deg, #0f7b44 0%, #efe6dd 45%, #4a1717 100%)' }} />
      */}
      <div className="absolute inset-0 -z-20" aria-hidden>
        <div className="absolute inset-0" style={{ background: '#050d14' }} />
        {/* Stronger veil + radial highlight */}
        <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.18) 100%)' }} />
        <svg className="absolute -z-0 opacity-16" style={{ right: "-8%", top: "-6%", width: "70%" }} viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ps-rad" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#efe6dd" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#4a1717" stopOpacity="0.04" />
            </radialGradient>
          </defs>
          <circle cx="300" cy="300" r="250" fill="url(#ps-rad)" />
        </svg>
      </div>

      {/* content */}
      <div className="relative z-10" style={{ color: "#3e0404ff" }}>{children}</div>
    </div>
  )
}
