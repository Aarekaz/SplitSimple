"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator, FileText } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { getBillSummary } from "@/lib/calculations"
import { cn } from "@/lib/utils"

interface TaxTipSectionProps {
  className?: string
}

export function TaxTipSection({ className }: TaxTipSectionProps) {
  const { state, dispatch } = useBill()
  const { tax, tip, discount, taxTipAllocation, notes } = state.currentBill
  const summary = getBillSummary(state.currentBill)
  const subtotal = summary.subtotal

  const sanitizeNumericInput = (value: string) => {
    let sanitized = value.replace(/[^0-9.]/g, "")
    const parts = sanitized.split(".")
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join("")}`
    }
    return sanitized
  }

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_TAX", payload: sanitizeNumericInput(e.target.value) })
  }

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_TIP", payload: sanitizeNumericInput(e.target.value) })
  }

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_DISCOUNT", payload: sanitizeNumericInput(e.target.value) })
  }

  const handleTaxTipAllocationChange = (value: "proportional" | "even") => {
    dispatch({ type: "SET_TAX_TIP_ALLOCATION", payload: value })
  }

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: "SET_NOTES", payload: e.target.value })
  }

  const handleTipPercentage = (percentage: number) => {
    const tipAmount = (subtotal * percentage / 100).toFixed(2)
    dispatch({ type: "SET_TIP", payload: tipAmount })
  }

  const tipPercentages = [15, 18, 20, 25]

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5">
            <Calculator className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Tax, Tip & Discount</h3>
            <p className="text-xs text-muted-foreground">Additional charges & savings</p>
          </div>
        </div>
        <Select value={taxTipAllocation} onValueChange={handleTaxTipAllocationChange}>
          <SelectTrigger className="w-36 sm:w-44 h-9 rounded-xl border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="proportional">Split proportionally</SelectItem>
            <SelectItem value="even">Split evenly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="float-card-sm border-0 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tax</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                step="0.01"
                min="0"
                value={tax}
                onChange={handleTaxChange}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="receipt-amount h-11 pr-10 rounded-xl border-border/50 focus:border-primary transition-all duration-200"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                $
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tip</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                step="0.01"
                min="0"
                value={tip}
                onChange={handleTipChange}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="receipt-amount h-11 pr-10 rounded-xl border-border/50 focus:border-primary transition-all duration-200"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                $
              </div>
            </div>
            {/* Quick tip percentage buttons */}
            {subtotal > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {tipPercentages.map((percentage) => (
                  <Button
                    key={percentage}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTipPercentage(percentage)}
                    className="h-8 px-3 text-xs rounded-lg border-border/50 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 font-medium"
                  >
                    {percentage}%
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Discount</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                step="0.01"
                min="0"
                value={discount}
                onChange={handleDiscountChange}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="receipt-amount h-11 pr-10 rounded-xl border-border/50 focus:border-primary transition-all duration-200"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                $
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Notes */}
        <div className="border-t border-border/50 pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-semibold">Receipt Notes</label>
          </div>
          <Textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add custom notes... (e.g., 'Service charge included', 'Cash only', etc.)"
            className="min-h-[70px] text-sm resize-none rounded-xl border-border/50 focus:border-primary transition-all duration-200"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground font-medium">
            Optional footer message that appears on shared receipts ({notes.length}/200)
          </p>
        </div>
      </div>
    </div>
  )
}
