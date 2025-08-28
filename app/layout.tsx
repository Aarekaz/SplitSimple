import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
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
    <html lang="en" className={`${jetbrainsMono.variable} antialiased`}>
      <body>
        <PostHogProvider>
          <ErrorBoundary>
            <BillProvider>
              <div className="flex flex-col min-h-screen">
                <main className="flex-grow">{children}</main>
                <Toaster />
                <footer className="flex-shrink-0 container mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
                  <span>
                    Crafted by{' '}
                    <a
                      href="https://github.com/aarekaz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline underline-offset-4 hover:text-primary"
                    >
                      Anurag Dhungana
                    </a>
                    .
                  </span>
                  <span className="mx-2">|</span>
                  <span>
                    <a
                      href="https://github.com/aarekaz/splitsimple"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline underline-offset-4 hover:text-primary"
                    >
                      View Source on GitHub
                    </a>
                  </span>
                </footer>
              </div>
              <Analytics />
            </BillProvider>
          </ErrorBoundary>
        </PostHogProvider>
      </body>
    </html>
  )
}