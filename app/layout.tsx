import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono, IBM_Plex_Mono, Inter } from "next/font/google"
import "./globals.css"
import { BillProvider } from "@/contexts/BillContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { PostHogProvider } from "@/components/PostHogProvider"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "SplitSimple - Easy Expense Splitting",
  description: "Split expenses with friends and colleagues effortlessly",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${ibmPlexMono.variable} ${inter.variable} antialiased`}>
      <body>
        <PostHogProvider>
          <ErrorBoundary>
            <BillProvider>
              {children}
              <Toaster />
              <Analytics />
            </BillProvider>
          </ErrorBoundary>
        </PostHogProvider>
      </body>
    </html>
  )
}