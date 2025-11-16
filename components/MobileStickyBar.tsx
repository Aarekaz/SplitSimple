"use client"

import { formatCurrency } from "@/lib/utils"
import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileStickyBarProps {
  total: number
  onShare: () => void
}

export function MobileStickyBar({ total, onShare }: MobileStickyBarProps) {
  return (
    <div className="thermal-sticky-bar lg:hidden">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">TOTAL:</span>
            <span className="text-2xl font-bold font-mono tabular-nums">{formatCurrency(total)}</span>
          </div>
          <Button
            onClick={onShare}
            size="sm"
            className="bg-primary hover:bg-primary-600 text-white font-medium"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  )
}
