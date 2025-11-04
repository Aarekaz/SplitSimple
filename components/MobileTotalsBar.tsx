"use client"

import { useState, useRef, useEffect } from "react"
import { Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { TotalsPanel } from "./TotalsPanel"
import { useBill } from "@/contexts/BillContext"
import { getBillSummary } from "@/lib/calculations"
import { formatCurrency } from "@/lib/utils"
import { SyncStatusIndicator } from "./SyncStatusIndicator"
import { AnimatedCurrency } from "./AnimatedCurrency"

export function MobileTotalsBar() {
  const { state } = useBill()
  const summary = getBillSummary(state.currentBill)
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const personInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAddingPerson) {
      setTimeout(() => personInputRef.current?.focus(), 0)
    }
  }, [isAddingPerson])

  const getPerson = (personId: string) => {
    return state.currentBill.people.find((p) => p.id === personId)
  }

  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="fixed inset-x-0 bottom-5 z-50 px-5 pb-1 lg:hidden">
        <div className="mx-auto w-full max-w-[1640px]">
          <div className="surface-card flex items-center justify-between gap-3 rounded-[26px] border border-border px-5 py-4 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <AnimatedCurrency 
                  value={summary.total} 
                  className="text-lg font-semibold text-foreground"
                />
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {state.currentBill.people.length} people • {state.currentBill.items.length} items
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                <SyncStatusIndicator compact />
                {state.syncStatus === "synced" && state.lastSyncTime && (
                  <div className="mt-0.5">
                    {(() => {
                      const now = Date.now()
                      const diff = now - state.lastSyncTime
                      const minutes = Math.floor(diff / 60000)
                      if (minutes < 1) return "Just synced"
                      if (minutes < 60) return `${minutes}m ago`
                      const hours = Math.floor(minutes / 60)
                      if (hours < 24) return `${hours}h ago`
                      const days = Math.floor(hours / 24)
                      return `${days}d ago`
                    })()}
                  </div>
                )}
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full border border-border bg-surface-2 px-4 py-2 font-semibold uppercase tracking-wider"
                  >
                    View Details
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="flex max-h-[82vh] flex-col rounded-t-[28px] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Bill Totals</SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto p-5 pt-8">
                    <TotalsPanel
                      compact
                      isAddingPerson={isAddingPerson}
                      setIsAddingPerson={setIsAddingPerson}
                      personInputRef={personInputRef}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="h-20 lg:hidden" />
    </>
  )
}
