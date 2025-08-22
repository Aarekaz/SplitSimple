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
import { generateItemBreakdownText, downloadCSV, copyToClipboard } from "@/lib/export"

export function ExportActions({ children }: { children: React.ReactNode }) {
  const { state } = useBill()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
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
  )
}
