"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Calculator, Users, Receipt } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { getBillSummary } from "@/lib/calculations"

export function TotalsPanel() {
  const { state, dispatch } = useBill()
  const summary = getBillSummary(state.currentBill)

  const handleTaxTipAllocationChange = (allocation: "proportional" | "even" | "specific") => {
    dispatch({ type: "SET_TAX_TIP_ALLOCATION", payload: allocation })
  }

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

  const peopleCount = state.currentBill.people.length
  const isCompactMode = peopleCount > 6
  const hasLargeAmounts = summary.total > 1000

  return (
    <div className="space-y-4">
      {/* Tax/Tip Allocation Method */}
      {(state.currentBill.tax > 0 || state.currentBill.tip > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Tax & Tip Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={state.currentBill.taxTipAllocation} onValueChange={handleTaxTipAllocationChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proportional">Proportional to Order</SelectItem>
                <SelectItem value="even">Split Evenly</SelectItem>
                <SelectItem value="specific">Specific People</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Person Totals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Individual Totals
            {peopleCount > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">
                {peopleCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className={isCompactMode ? "max-h-64 overflow-y-auto" : ""}>
          {summary.personTotals.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Add people to see individual totals</p>
            </div>
          ) : (
            <div className={`space-y-${isCompactMode ? "2" : "3"}`}>
              {summary.personTotals.map((personTotal) => {
                const person = getPerson(personTotal.personId)
                if (!person) return null

                return (
                  <div key={person.id} className={`space-y-${isCompactMode ? "1" : "2"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`${isCompactMode ? "w-2 h-2" : "w-3 h-3"} rounded-full`}
                          style={{ backgroundColor: person.color }}
                        />
                        <span className={`font-medium ${isCompactMode ? "text-xs" : "text-sm"}`}>{person.name}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`font-mono ${isCompactMode ? "text-xs px-2 py-0" : ""} ${hasLargeAmounts ? "text-xs" : ""}`}
                      >
                        {formatCurrency(personTotal.total)}
                      </Badge>
                    </div>

                    {(personTotal.tax > 0 || personTotal.tip > 0) && !isCompactMode && (
                      <div className="ml-5 space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(personTotal.subtotal)}</span>
                        </div>
                        {personTotal.tax > 0 && (
                          <div className="flex justify-between">
                            <span>Tax:</span>
                            <span>{formatCurrency(personTotal.tax)}</span>
                          </div>
                        )}
                        {personTotal.tip > 0 && (
                          <div className="flex justify-between">
                            <span>Tip:</span>
                            <span>{formatCurrency(personTotal.tip)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Bill Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className={`font-mono ${hasLargeAmounts ? "text-xs" : ""}`}>
                {formatCurrency(summary.subtotal)}
              </span>
            </div>

            {summary.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span className={`font-mono ${hasLargeAmounts ? "text-xs" : ""}`}>{formatCurrency(summary.tax)}</span>
              </div>
            )}

            {summary.tip > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tip:</span>
                <span className={`font-mono ${hasLargeAmounts ? "text-xs" : ""}`}>{formatCurrency(summary.tip)}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span className={`font-mono ${hasLargeAmounts ? "text-base" : "text-lg"}`}>
                {formatCurrency(summary.total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {state.currentBill.items.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div
              className={`grid ${state.currentBill.items.length > 10 || peopleCount > 10 ? "grid-cols-3" : "grid-cols-2"} gap-4 text-center`}
            >
              <div>
                <div className="text-2xl font-bold text-primary">{state.currentBill.items.length}</div>
                <div className="text-xs text-muted-foreground">Items</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{peopleCount}</div>
                <div className="text-xs text-muted-foreground">People</div>
              </div>
              {peopleCount > 0 && (state.currentBill.items.length > 10 || peopleCount > 10) && (
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(summary.total / peopleCount).replace(/[^0-9.]/g, "")}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg/Person</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
