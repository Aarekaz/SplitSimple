import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BillProvider } from "@/contexts/BillContext"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"

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
    <html lang="en" className={`${inter.variable} antialiased`}>
      <head>
        <style>{`
html {
  font-family: ${inter.style.fontFamily};
  --font-sans: ${inter.style.fontFamily};
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
        `}</style>
      </head>
      <body>
        <BillProvider>
          {children}
          <Toaster />
          <footer className="container mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
            <span>
              Crafted by{" "}
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
          <Analytics />
        </BillProvider>
      </body>
    </html>
  )
}
