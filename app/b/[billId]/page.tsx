import { Suspense } from "react"
import { ProBillSplitter } from "@/components/ProBillSplitter"

export default function SharedBillPage() {
  return (
    <Suspense>
      <ProBillSplitter />
    </Suspense>
  )
}
