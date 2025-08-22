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
  const [isExpanded, setIsExpanded] = useState(false)

  const formatCurrency = (amount: number) => {
    const symbol =
      state.currentBill.currency === "USD"
        ? "$"
        : state.currentBill.currency === "EUR"
          ? "€"
          : state.currentBill.currency === "GBP"
            ? "£"
            : "$"
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

              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh]">
                    <SheetHeader>
                      <SheetTitle>Bill Totals</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 overflow-y-auto">
                      <TotalsPanel />
                    </div>
                  </SheetContent>
                </Sheet>

                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-2">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Expanded View */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {summary.personTotals.slice(0, 3).map((personTotal) => {
                  const person = getPerson(personTotal.personId)
                  if (!person) return null

                  return (
                    <div key={person.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: person.color }} />
                        <span className="text-sm">{person.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(personTotal.total)}
                      </Badge>
                    </div>
                  )
                })}

                {summary.personTotals.length > 3 && (
                  <div className="text-center text-xs text-muted-foreground">
                    +{summary.personTotals.length - 3} more people
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="lg:hidden h-20" />
    </>
  )
}
