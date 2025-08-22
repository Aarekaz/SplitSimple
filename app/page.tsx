"use client"

import type React from "react"

import { CollapsibleItemsTable } from "@/components/CollapsibleItemsTable"
import { TotalsPanel } from "@/components/TotalsPanel"
import { MobileTotalsBar } from "@/components/MobileTotalsBar"
import { ExportActions } from "@/components/ExportActions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Receipt, Plus, Copy, Upload } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { generateSummaryText, copyToClipboard } from "@/lib/export"
import { useState, useEffect } from "react"

export default function HomePage() {
  const { state, dispatch } = useBill()
  const { toast } = useToast()

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_BILL_TITLE", payload: e.target.value })
  }

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value) || 0
    dispatch({ type: "SET_TAX", payload: value })
  }

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value) || 0
    dispatch({ type: "SET_TIP", payload: value })
  }

  const handleNewBill = () => {
    dispatch({ type: "NEW_BILL" })
  }

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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">SplitSimple</span>
              </div>
              <Input
                value={state.currentBill.title}
                onChange={handleTitleChange}
                placeholder="Untitled Bill"
                className="h-8 w-36 sm:w-48 border-0 bg-transparent text-lg font-semibold text-foreground px-2 focus:bg-input focus:border focus:border-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <TooltipProvider delayDuration={300}>
                {/* Copy Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleCopySummary} className="h-8">
                      <Copy className="h-4 w-4 lg:mr-2" />
                      <span className="hidden lg:inline">Copy Summary</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="lg:hidden">Copy Summary</TooltipContent>
                </Tooltip>

                {/* Export Button */}
                <ExportActions>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Upload className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">Export</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="lg:hidden">Export</TooltipContent>
                  </Tooltip>
                </ExportActions>

                {/* New Bill Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleNewBill} size="sm" className="h-8">
                      <Plus className="h-4 w-4 lg:mr-1" />
                      <span className="hidden lg:inline">New Bill</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="lg:hidden">New Bill</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <CollapsibleItemsTable />
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-6">
              <TotalsPanel />
            </div>
          </div>
        </div>
      </main>

      <MobileTotalsBar />
    </div>
  )
}
