"use client"

import { useState } from "react"
import { ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Person } from "@/contexts/BillContext"
import type { PersonTotal, ItemBreakdown } from "@/lib/calculations"

interface CompactPersonCardProps {
  person: Person
  personTotal: PersonTotal
  itemBreakdowns: ItemBreakdown[]
  totalBill: number
  onRemove: (personId: string) => void
}

export function CompactPersonCard({
  person,
  personTotal,
  itemBreakdowns,
  totalBill,
  onRemove
}: CompactPersonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const percentage = totalBill > 0 ? Math.round((personTotal.total / totalBill) * 100) : 0
  const initial = person.name.charAt(0).toUpperCase()

  // Get items this person is assigned to
  const personItems = itemBreakdowns.filter(
    breakdown => breakdown.splits[person.id] > 0
  )

  return (
    <div className="thermal-person-card p-3 group">
      {/* Collapsed View - Single Line */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Person Initial */}
          <div
            className="thermal-person-initial"
            style={{
              backgroundColor: person.color,
              color: '#fff'
            }}
          >
            {initial}
          </div>

          {/* Name and Item Count */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">[{initial}] {person.name}</span>
              <span className="text-xs text-muted-foreground">
                {personItems.length} item{personItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            {/* Progress Bar */}
            {!isExpanded && (
              <div className="thermal-progress-bar mt-1.5">
                <div
                  className="thermal-progress-fill"
                  style={{
                    width: `${percentage}%`,
                    color: person.color
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Amount and Expand Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="font-mono font-bold text-sm">
              {formatCurrency(personTotal.total)}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {percentage}%
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(person.id)
            }}
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded View - Itemized Breakdown */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-2 animate-in slide-in-from-top-1 duration-200">
          {/* Progress Bar in Expanded View */}
          <div className="thermal-progress-bar mb-3">
            <div
              className="thermal-progress-fill"
              style={{
                width: `${percentage}%`,
                color: person.color
              }}
            />
          </div>

          {/* Item List */}
          <div className="space-y-1.5 text-xs">
            {personItems.map((breakdown) => (
              <div key={breakdown.itemId} className="flex justify-between items-center">
                <span className="text-muted-foreground">• {breakdown.itemName}</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(breakdown.splits[person.id])}
                </span>
              </div>
            ))}
          </div>

          {/* Tax, Tip, Discount */}
          {(personTotal.tax > 0 || personTotal.tip > 0 || personTotal.discount > 0) && (
            <div className="border-t pt-2 space-y-1 text-xs">
              {personTotal.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono">{formatCurrency(personTotal.tax)}</span>
                </div>
              )}
              {personTotal.tip > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="font-mono">{formatCurrency(personTotal.tip)}</span>
                </div>
              )}
              {personTotal.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono text-green-600">-{formatCurrency(personTotal.discount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatCurrency(personTotal.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
