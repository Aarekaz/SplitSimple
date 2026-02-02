"use client"

import { Suspense } from "react"
import { ProBillSplitter } from "@/components/ProBillSplitter"

export default function HomePage() {
  return (
    <Suspense>
      <ProBillSplitter />
    </Suspense>
  )
}
