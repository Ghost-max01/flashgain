import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import PageShell from "@/components/PageShell"
import { NotificationHelperTools } from "@/components/notification-helper-tools"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FlashGain 9ja",
  description:
    "FlashGain 9ja is a financial & earning app that offers weekly cash rewards to new users",
  manifest: "/manifest.webmanifest?v=20260317",
  generator: "v0.dev",
  other: {
    "8c56abd733d73550a5527a8ac0c7bc62642d1a86":
      "8c56abd733d73550a5527a8ac0c7bc62642d1a86",
  },
  openGraph: {
    title: "FlashGain 9ja",
    description:
      "FlashGain 9ja is a financial & earning app that offers weekly cash rewards to new users",
    url: "https://helpinghands.money",
    siteName: "FlashGain 9ja",
    images: [
      {
        url: "https://helpinghands.money/placeholder-logo.png",
        width: 1200,
        height: 630,
        alt: "FlashGain 9ja",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlashGain 9ja",
    description:
      "FlashGain 9ja is a financial & earning app that offers weekly cash rewards to new users",
    images: ["https://helpinghands.money/placeholder-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ea580c" />
        <link rel="manifest" href="/manifest.webmanifest?v=20260317" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png?v=20260317" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png?v=20260317" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png?v=20260317" />
        <link rel="icon" href="/favicon.ico?v=20260317" />
        {/* Head scripts intentionally left minimal */}
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <PageShell exclude={["/dashboard"]}>
            <main className="min-h-screen w-full relative overflow-hidden">
              {children}
            </main>
          </PageShell>
          <NotificationHelperTools />
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}