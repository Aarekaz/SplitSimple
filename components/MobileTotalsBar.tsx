"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { TotalsPanel } from "./TotalsPanel"
import { useBill } from "@/contexts/BillContext"
import { getBillSummary } from "@/lib/calculations"

export function MobileTotalsBar() {
  const { state } = useBill()
  const summary = getBillSummary(state.currentBill)

  const formatCurrency = (amount: number) => {
    const symbol = "$"
    return `${symbol}${amount.toFixed(2)}`
  }

  const getPerson = (personId: string) => {
    return state.currentBill.people.find((p) => p.id === personId)
  }

  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <Card className="rounded-none border-0 border-t">
          <CardContent className="p-4">
            {/* Collapsed View */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">{formatCurrency(summary.total)}</div>
                  <div className="text-xs text-muted-foreground">
                    {state.currentBill.people.length} people • {state.currentBill.items.length} items
                  </div>
                </div>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
                  <SheetHeader className="px-6 pt-6">
                    <SheetTitle>Bill Totals</SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto p-6 pt-4">
                    <TotalsPanel compact />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="lg:hidden h-20" />
    </>
  )
}
