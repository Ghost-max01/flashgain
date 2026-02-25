import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import PageShell from "@/components/PageShell"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Flash Gain",
  description:
    "Flash Gain is a financial & earning app that offers weekly cash rewards to new users",
  manifest: "/manifest.json",
  generator: "v0.dev",
  other: {
    "8c56abd733d73550a5527a8ac0c7bc62642d1a86":
      "8c56abd733d73550a5527a8ac0c7bc62642d1a86",
  },
  openGraph: {
    title: "Flash Gain",
    description:
      "Flash Gain is a financial & earning app that offers weekly cash rewards to new users",
    url: "https://helpinghands.money",
    siteName: "Flash Gain",
    images: [
      {
        url: "https://helpinghands.money/placeholder-logo.png",
        width: 1200,
        height: 630,
        alt: "Flash Gain",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flash Gain",
    description:
      "Flash Gain is a financial & earning app that offers weekly cash rewards to new users",
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
        {/* Head scripts intentionally left minimal */}
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <PageShell exclude={["/dashboard"]}>
            <main className="min-h-screen max-w-md mx-auto relative overflow-hidden">
              {children}
            </main>
          </PageShell>
        </ThemeProvider>
        <script src="https://pl28642303.effectivegatecpm.com/45/a8/f9/45a8f9e6b9c71890da4d65396ab53e17.js"></script>
      </body>
    </html>
  )
}