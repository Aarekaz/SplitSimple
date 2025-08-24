"use client"

import { useBill } from "@/contexts/BillContext"
import { getBillSummary, getItemBreakdowns } from "@/lib/calculations"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Receipt, Printer, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReceiptViewProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  showText?: boolean
}

export function ReceiptView({ variant = "outline", size = "sm", showText = true }: ReceiptViewProps) {
  const { state } = useBill()
  const { toast } = useToast()
  const summary = getBillSummary(state.currentBill)
  const itemBreakdowns = getItemBreakdowns(state.currentBill)

  const handlePrint = () => {
    window.print()
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusLabel = () => {
    switch (state.currentBill.status) {
      case "draft": return "Draft Receipt"
      case "active": return "Active Receipt"
      case "closed": return "Receipt Closed"
      default: return "Receipt"
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="flex items-center gap-1.5">
          <Receipt className="h-4 w-4" />
          {showText && <span>Receipt View</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt Preview
          </DialogTitle>
        </DialogHeader>
        
        {/* Receipt Content */}
        <div className="receipt-content font-mono text-sm space-y-6 bg-white text-black p-6 rounded-lg border">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-tight">
              {state.currentBill.title}
            </h1>
            <p className="text-xs text-gray-600 uppercase tracking-wider">
              {getStatusLabel()}
            </p>
            <p className="text-xs text-gray-500">
              {getCurrentDate()}
            </p>
            <div className="border-b border-dashed border-gray-300 my-4"></div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {state.currentBill.items.map((item) => {
              const itemPrice = parseFloat(item.price) || 0
              return (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.splitWith.length} {item.splitWith.length === 1 ? 'person' : 'people'} • {item.method}
                    </div>
                  </div>
                  <div className="font-bold text-right">
                    {formatCurrency(itemPrice)}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-b border-dashed border-gray-300"></div>

          {/* Subtotal */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold">{formatCurrency(summary.subtotal)}</span>
            </div>

            {summary.tax > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-bold">{formatCurrency(summary.tax)}</span>
              </div>
            )}

            {summary.tip > 0 && (
              <div className="flex justify-between">
                <span>Tip</span>
                <span className="font-bold">{formatCurrency(summary.tip)}</span>
              </div>
            )}
          </div>

          <div className="border-b border-gray-400"></div>

          {/* Total */}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(summary.total)}</span>
          </div>

          {/* People Breakdown */}
          {summary.personTotals.length > 0 && (
            <>
              <div className="border-b border-dashed border-gray-300"></div>
              <div className="space-y-2">
                <h3 className="font-bold text-center text-sm uppercase tracking-wider">
                  Breakdown
                </h3>
                {summary.personTotals.map((personTotal) => {
                  const person = state.currentBill.people.find(p => p.id === personTotal.personId)
                  return person ? (
                    <div key={person.id} className="flex justify-between">
                      <span>{person.name}</span>
                      <span className="font-bold">{formatCurrency(personTotal.total)}</span>
                    </div>
                  ) : null
                })}
              </div>
            </>
          )}

          {/* Notes */}
          {state.currentBill.notes && (
            <>
              <div className="border-b border-dashed border-gray-300"></div>
              <div className="text-center text-xs text-gray-600 italic">
                {state.currentBill.notes}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="text-center space-y-1">
            <div className="border-b border-dashed border-gray-300 mb-2"></div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Generated by SplitSimple
            </p>
            <p className="text-xs text-gray-400">
              Bill ID: {state.currentBill.id}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="flex-1 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
