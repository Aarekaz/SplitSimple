import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Source_Sans_3 } from "next/font/google"
import "./globals.css"
import { BillProvider } from "@/contexts/BillContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { PostHogProvider } from "@/components/PostHogProvider"

const interDisplay = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-variable",
  weight: ["400", "500", "600", "700", "800"],
})

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body-variable",
  weight: ["400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
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
    <html
      lang="en"
      className={`${interDisplay.variable} ${sourceSans.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <PostHogProvider>
            <ErrorBoundary>
              <BillProvider>
                {children}
                <Toaster />
                <Analytics />
              </BillProvider>
            </ErrorBoundary>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
