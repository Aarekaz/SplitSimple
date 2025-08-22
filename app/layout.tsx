import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BillProvider } from "@/contexts/BillContext"
import { Toaster } from "@/components/ui/toaster"

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
          <footer className="mt-8 py-4 text-center text-sm text-gray-500 border-t border-gray-200">
            Made by Anurag Dhungana
          </footer>
        </BillProvider>
      </body>
    </html>
  )
}
