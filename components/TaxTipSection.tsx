"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Copy, Share2 } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { getBillSummary } from "@/lib/calculations"
import { cn, formatCurrency } from "@/lib/utils"
import { generateSummaryText, copyToClipboard } from "@/lib/export"
import { useToast } from "@/hooks/use-toast"
import { useBillAnalytics } from "@/hooks/use-analytics"

interface TaxTipSectionProps {
  className?: string
}

export function TaxTipSection({ className }: TaxTipSectionProps) {
  const { state, dispatch } = useBill()
  const { tax, tip, discount, taxTipAllocation, notes } = state.currentBill
  const summary = getBillSummary(state.currentBill)
  const subtotal = summary.subtotal
  const { toast } = useToast()
  const analytics = useBillAnalytics()

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

  const handleTipPercentage = (percentage: number) => {
    const tipAmount = (subtotal * percentage / 100).toFixed(2)
    dispatch({ type: "SET_TIP", payload: tipAmount })
  }

  const tipPercentages = [15, 18, 20, 25]

  const handleCopySummary = async () => {
    const summaryText = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(summaryText)

    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "Bill summary has been copied to your clipboard",
      })
      analytics.trackFeatureUsed("copy_summary")
    } else {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={cn("receipt-container", className)}>
      {/* Section Header */}
      <div className="receipt-section-header">
        <span>PAYMENT SUMMARY</span>
      </div>

      {/* Tax & Tip Inputs */}
      <div className="p-5 space-y-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Split Method
          </label>
          <Select value={taxTipAllocation} onValueChange={handleTaxTipAllocationChange}>
            <SelectTrigger className="w-40 h-8 text-xs border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proportional">Proportional</SelectItem>
              <SelectItem value="even">Even</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={tax}
                onChange={handleTaxChange}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="h-9 pl-7 pr-3 text-sm border-border font-receipt text-right"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tip</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={tip}
                onChange={handleTipChange}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="h-9 pl-7 pr-3 text-sm border-border font-receipt text-right"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Discount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={discount}
                onChange={handleDiscountChange}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="h-9 pl-7 pr-3 text-sm border-border font-receipt text-right"
              />
            </div>
          </div>
        </div>

        {/* Quick Tip Buttons */}
        {subtotal > 0 && (
          <div className="flex gap-1.5 flex-wrap pt-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide self-center mr-1">Quick tip:</span>
            {tipPercentages.map((percentage) => (
              <Button
                key={percentage}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTipPercentage(percentage)}
                className="h-7 px-2.5 text-xs border-border hover:bg-primary hover:text-white transition-all"
              >
                {percentage}%
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Totals */}
      <div className="p-5 space-y-3 border-b-2 border-border font-receipt">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-bold tabular-nums">{formatCurrency(summary.subtotal)}</span>
        </div>

        {parseFloat(tax) > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-bold tabular-nums">{formatCurrency(parseFloat(tax))}</span>
          </div>
        )}

        {parseFloat(tip) > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Tip</span>
            <span className="font-bold tabular-nums">{formatCurrency(parseFloat(tip))}</span>
          </div>
        )}

        {parseFloat(discount) > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-destructive">Discount</span>
            <span className="font-bold tabular-nums text-destructive">-{formatCurrency(parseFloat(discount))}</span>
          </div>
        )}

        <div className="border-t-2 border-dashed border-border pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold uppercase tracking-wide">Total</span>
            <span className="text-2xl font-bold tabular-nums">{formatCurrency(summary.total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex gap-3">
        <Button
          onClick={handleCopySummary}
          className="flex-1 receipt-button h-10 text-sm font-bold uppercase"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Summary
        </Button>
        <Button
          onClick={() => document.getElementById('share-bill-trigger')?.click()}
          className="flex-1 receipt-button h-10 text-sm font-bold uppercase"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Bill
        </Button>
      </div>
    </div>
  )
}
