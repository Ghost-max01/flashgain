import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import PageShell from "@/components/PageShell"
import { NoPinchZoom } from "@/components/no-pinch-zoom"
import { NotificationHelperTools } from "@/components/notification-helper-tools"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ServiceWorkerUpdater } from "@/components/service-worker-updater"
import { ClientCrashGuard } from "@/components/client-crash-guard"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Moneymate 9ja",
  description:
    "Moneymate 9ja is a financial & earning app that offers weekly cash rewards to new users",
  manifest: "/manifest.json?v=20260318",
  generator: "v0.dev",
  openGraph: {
    title: "Moneymate 9ja",
    description:
      "Moneymate 9ja is a financial & earning app that offers weekly cash rewards to new users",
    url: "https://helpinghands.money",
    siteName: "Moneymate 9ja",
    images: [
      {
        url: "https://helpinghands.money/placeholder-logo.png",
        width: 1200,
        height: 630,
        alt: "Moneymate 9ja",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moneymate 9ja",
    description:
      "Moneymate 9ja is a financial & earning app that offers weekly cash rewards to new users",
    images: ["https://helpinghands.money/placeholder-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" style={{ background: "#050d14" }}>
      <head>
        <meta name="theme-color" content="#ea580c" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        {/* Critical first-paint: new brand base (dark + orange). Old green/purple
            flash came from unstyled white paint before CSS/JS loaded. */}
        <style>{`html,body{background:#050d14 !important;color:#fff !important;}`}</style>
        <link rel="manifest" href="/manifest.json?v=20260318" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png?v=20260318" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png?v=20260318" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png?v=20260318" />
        <link rel="icon" href="/favicon.ico?v=20260318" />
        {/* Head scripts intentionally left minimal */}
      </head>
      <body className={inter.className} style={{ background: "#050d14" }} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NoPinchZoom />
          <ClientCrashGuard />
          <ServiceWorkerUpdater />
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