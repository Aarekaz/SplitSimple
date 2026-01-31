import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { BillProvider } from "@/contexts/BillContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { PostHogProvider } from "@/components/PostHogProvider"

export const metadata: Metadata = {
  metadataBase: new URL("https://splitsimple.anuragd.me"),
  title: "SplitSimple - Easy Expense Splitting",
  description: "Split expenses with friends and colleagues effortlessly",
  generator: "v0.app",
  openGraph: {
    title: "SplitSimple - Easy Expense Splitting",
    description: "Split expenses with friends and colleagues effortlessly",
    url: "https://splitsimple.anuragd.me",
    siteName: "SplitSimple",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SplitSimple bill splitting summary preview",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SplitSimple - Easy Expense Splitting",
    description: "Split expenses with friends and colleagues effortlessly",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SplitSimple bill splitting summary preview",
      },
    ],
  },
  other: {
    "theme-color": "#1E40AF",
    "msapplication-TileColor": "#1E40AF",
  },
  appleWebApp: {
    title: "SplitSimple",
    statusBarStyle: "black-translucent",
    capable: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="antialiased">
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
