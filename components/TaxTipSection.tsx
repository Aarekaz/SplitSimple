"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Calculator, Percent, FileText } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { cn } from "@/lib/utils"

interface TaxTipSectionProps {
  className?: string
}

export function TaxTipSection({ className }: TaxTipSectionProps) {
  const { state, dispatch } = useBill()
  const { tax, tip, taxTipAllocation, notes } = state.currentBill

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

  const handleTaxTipAllocationChange = (value: "proportional" | "even") => {
    dispatch({ type: "SET_TAX_TIP_ALLOCATION", payload: value })
  }

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: "SET_NOTES", payload: e.target.value })
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/20">
          <Calculator className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Tax & Tip</h3>
          <p className="text-xs text-muted-foreground">Additional charges</p>
        </div>
      </div>
      
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
                className="receipt-amount h-10 pr-8"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
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
                className="receipt-amount h-10 pr-8"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Split Method</span>
            </div>
            <Select value={taxTipAllocation} onValueChange={handleTaxTipAllocationChange}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proportional">Proportionally</SelectItem>
                <SelectItem value="even">Evenly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {taxTipAllocation === "proportional" 
              ? "Split based on each person's subtotal" 
              : "Split equally among all people"}
          </p>
        </div>

        {/* Receipt Notes */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Receipt Notes</label>
          </div>
          <Textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add custom notes... (e.g., 'Service charge included', 'Cash only', etc.)"
            className="min-h-[60px] text-sm resize-none"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            Optional footer message that appears on shared receipts ({notes.length}/200)
          </p>
        </div>
      </div>
    </div>
  )
}
