"use client"

import { useState, useEffect } from "react"
import { MobileCardView } from "./mobile/MobileCardView"
import { MobileGridView } from "./mobile/MobileGridView"
import { ViewToggle } from "./mobile/shared/ViewToggle"
import { SplitSimpleIcon } from "@/components/ProBillSplitter"
import { ReceiptScanner } from "@/components/ReceiptScanner"
import { ShareBill } from "@/components/ShareBill"
import { Input } from "@/components/ui/input"
import { useBill } from "@/contexts/BillContext"
import type { Item } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { cn } from "@/lib/utils"

export function MobileSpreadsheetView() {
  const { state, dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()

  const people = state.currentBill.people

  // View mode state with persistence
  const [viewMode, setViewMode] = useState<"cards" | "grid">("cards")

  // Load saved preference
  useEffect(() => {
    const savedView = localStorage.getItem("mobile-view-mode")
    if (savedView === "grid" || savedView === "cards") {
      setViewMode(savedView)
    }
  }, [])

  // Save preference when changed
  useEffect(() => {
    localStorage.setItem("mobile-view-mode", viewMode)
    analytics.trackFeatureUsed(`mobile_view_${viewMode}`)
  }, [viewMode, analytics])

  // Receipt scanner handler
  const handleScanImport = (scannedItems: Omit<Item, "id" | "splitWith" | "method">[]) => {
    scannedItems.forEach((item) => {
      const newItem: Omit<Item, "id"> = {
        ...item,
        splitWith: people.map((p) => p.id),
        method: "even",
      }
      dispatch({ type: "ADD_ITEM", payload: newItem })
    })
    analytics.trackFeatureUsed("scan_receipt_import", { count: scannedItems.length })
    toast({ title: "Items added from scan" })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b">
        <div className="px-4 py-3 flex items-center gap-3">
          <SplitSimpleIcon />
          <div className="flex-1 min-w-0">
            <Input
              value={state.currentBill.title}
              onChange={(e) => dispatch({ type: "SET_BILL_TITLE", payload: e.target.value })}
              className="h-9 text-base font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
            />
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest">SplitSimple</p>
          </div>
          <div className="flex items-center gap-2">
            <ReceiptScanner onImport={handleScanImport} />
            <ShareBill variant="outline" size="sm" showText={false} />
          </div>
        </div>

        {/* View Toggle */}
        <div className="px-4 pb-3 flex justify-center">
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </header>

      {/* Content - Conditional Rendering with Transitions */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className={cn(
            "absolute inset-0 transition-all duration-300 ease-in-out",
            viewMode === "cards" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full pointer-events-none"
          )}
        >
          {viewMode === "cards" && <MobileCardView />}
        </div>
        <div
          className={cn(
            "absolute inset-0 transition-all duration-300 ease-in-out",
            viewMode === "grid" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
          )}
        >
          {viewMode === "grid" && <MobileGridView />}
        </div>
      </div>
    </div>
  )
}
