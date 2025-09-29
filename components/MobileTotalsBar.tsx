"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronUp, ChevronDown, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { TotalsPanel } from "./TotalsPanel"
import { useBill } from "@/contexts/BillContext"
import { getBillSummary } from "@/lib/calculations"
import { formatCurrency } from "@/lib/utils"
import { SyncStatusIndicator } from "./SyncStatusIndicator"

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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40 transition-all duration-300">
        <Card className="rounded-none border-0 border-t card-elevated">
          <CardContent className="p-4">
            {/* Collapsed View */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <div>
                  <div className="receipt-amount text-base">{formatCurrency(summary.total)}</div>
                  <div className="receipt-detail">
                    {state.currentBill.people.length} people • {state.currentBill.items.length} items
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <SyncStatusIndicator compact />
                  {state.syncStatus === "synced" && state.lastSyncTime && (
                    <div className="text-xs text-muted-foreground mt-0.5">
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
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[80vh] flex flex-col p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Bill Totals</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto p-4 pt-6">
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
          </CardContent>
        </Card>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="lg:hidden h-20" />
    </>
  )
}
