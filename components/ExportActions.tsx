"use client"

import { useState } from "react"
import { Copy, Download, FileText, Table } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useBill } from "@/contexts/BillContext"
import { generateSummaryText, generateItemBreakdownText, downloadCSV, copyToClipboard } from "@/lib/export"

export function ExportActions() {
  const { state } = useBill()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)

  const handleCopySummary = async () => {
    if (state.currentBill.people.length === 0) {
      toast({
        title: "No data to copy",
        description: "Add people and items to generate a summary",
        variant: "destructive",
      })
      return
    }

    const summaryText = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(summaryText)

    if (success) {
      toast({
        title: "Summary copied!",
        description: "Bill summary has been copied to your clipboard",
      })
    } else {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCopyBreakdown = async () => {
    if (state.currentBill.items.length === 0) {
      toast({
        title: "No items to copy",
        description: "Add items to generate a breakdown",
        variant: "destructive",
      })
      return
    }

    const breakdownText = generateItemBreakdownText(state.currentBill)
    const success = await copyToClipboard(breakdownText)

    if (success) {
      toast({
        title: "Breakdown copied!",
        description: "Item breakdown has been copied to your clipboard",
      })
    } else {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExportCSV = async () => {
    if (state.currentBill.items.length === 0) {
      toast({
        title: "No data to export",
        description: "Add items to export CSV files",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      downloadCSV(state.currentBill)
      toast({
        title: "CSV exported!",
        description: "Items and totals CSV files have been downloaded",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export CSV files. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex gap-2">
      {/* Copy Summary Button */}
      <Button variant="outline" size="sm" onClick={handleCopySummary}>
        <Copy className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Copy Summary</span>
        <span className="sm:hidden">Copy</span>
      </Button>

      {/* Export Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyBreakdown}>
            <FileText className="h-4 w-4 mr-2" />
            Copy Item Breakdown
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportCSV}>
            <Table className="h-4 w-4 mr-2" />
            Download CSV Files
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
