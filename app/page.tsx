"use client"

import type React from "react"

import { CollapsibleItemsTable } from "@/components/CollapsibleItemsTable"
import { TotalsPanel } from "@/components/TotalsPanel"
import { MobileTotalsBar } from "@/components/MobileTotalsBar"
import { MobileFirstUI } from "@/components/MobileFirstUI"
import { MobileActionButton, MobileActionSpacer } from "@/components/MobileActionButton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Receipt, Plus, Copy } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { generateSummaryText, copyToClipboard } from "@/lib/export"
import { useState, useEffect, useRef } from "react"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { BillStatusIndicator } from "@/components/BillStatusIndicator"
import { ShareBill } from "@/components/ShareBill"
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator"

export default function HomePage() {
  const { state, dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const personInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [previousTitle, setPreviousTitle] = useState(state.currentBill.title)

  const isNewBillFlow =
    isInitialLoad && state.currentBill.title === "New Bill" && state.currentBill.people.length === 0

  useEffect(() => {
    if (isNewBillFlow) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
      setIsInitialLoad(false) // This is the key: we only do this once.
    }
  }, [isNewBillFlow])

  useEffect(() => {
    if (isAddingPerson) {
      setTimeout(() => personInputRef.current?.focus(), 0)
    }
  }, [isAddingPerson])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    dispatch({ type: "SET_BILL_TITLE", payload: newTitle })
    
    // Track title changes (debounced via useEffect)
    if (newTitle !== previousTitle) {
      setPreviousTitle(newTitle)
    }
  }

  // Track title changes with debouncing
  useEffect(() => {
    if (previousTitle !== state.currentBill.title && previousTitle !== "New Bill") {
      const timeoutId = setTimeout(() => {
        analytics.trackTitleChanged(state.currentBill.title)
      }, 1000) // 1 second debounce
      
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [state.currentBill.title, previousTitle, analytics])

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      setIsAddingPerson(true)
    }
  }

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_TAX", payload: e.target.value })
  }

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_TIP", payload: e.target.value })
  }

  const handleNewBill = () => {
    dispatch({ type: "NEW_BILL" })
    analytics.trackBillCreated()
    analytics.trackFeatureUsed("new_bill")
  }

  const handleCopySummary = async () => {
    if (state.currentBill.people.length === 0) {
      toast({
        title: "No data to copy",
        description: "Add people and items to generate a summary",
        variant: "destructive",
      })
      analytics.trackError("copy_summary_failed", "No data to copy")
      return
    }

    const summaryText = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(summaryText)

    if (success) {
      toast({
        title: "Summary copied!",
        description: "Bill summary has been copied to your clipboard",
      })
      analytics.trackBillSummaryCopied()
      analytics.trackFeatureUsed("copy_summary")
    } else {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      })
      analytics.trackError("copy_summary_failed", "Clipboard API failed")
    }
  }

  const handleAddPerson = () => {
    setIsAddingPerson(true)
    analytics.trackFeatureUsed("mobile_add_person")
  }

  const handleAddItem = () => {
    // Focus on the add item functionality
    analytics.trackFeatureUsed("mobile_add_item")
    // This would trigger the add item flow
  }


  return (
    <div className="bg-background">
      <header className="bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 sticky top-0 z-10 transition-all duration-300">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 smooth-hover rounded-lg px-2 py-1">
                <Receipt className="h-5 w-5 text-primary transition-transform duration-300 hover:scale-110" />
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline transition-colors duration-300">SplitSimple</span>
              </div>
              <Input
                ref={titleInputRef}
                value={state.currentBill.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled Bill"
                className="text-title h-9 w-36 sm:w-48 border-0 bg-transparent text-foreground px-2 input-smooth hover:bg-muted/30 focus:bg-input rounded-md font-semibold"
              />
            </div>

            <div className="flex items-center gap-2">
              <BillStatusIndicator compact={true} showSelector={true} />
              
              <SyncStatusIndicator compact />
              
              <ShareBill size="sm" showText={false} />
              
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

      <main className="container mx-auto px-4 py-4 lg:py-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Mobile-first UI for empty state */}
            {isMobile && state.currentBill.people.length === 0 ? (
              <MobileFirstUI />
            ) : state.currentBill.people.length > 0 ? (
              <CollapsibleItemsTable />
            ) : (
              <Card>
                <CardHeader className="text-center p-4 lg:p-6">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="font-mono">
                    {isNewBillFlow ? "Welcome to SplitSimple!" : "Who's splitting the bill?"}
                  </CardTitle>
                  <p className="text-muted-foreground pt-1">
                    {isNewBillFlow
                      ? "First, give your bill a name above."
                      : isMobile
                      ? "Tap 'View Details' below to add people."
                      : "Add the first person on the right to get started."}
                  </p>
                </CardHeader>
              </Card>
            )}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-6">
              <TotalsPanel
                isAddingPerson={isAddingPerson}
                setIsAddingPerson={setIsAddingPerson}
                personInputRef={personInputRef}
              />
            </div>
          </div>
        </div>
        
        {/* Mobile Action Button */}
        {state.currentBill.people.length > 0 && (
          <MobileActionButton
            onAddPerson={handleAddPerson}
            onAddItem={handleAddItem}
            onViewReceipt={handleCopySummary}
          />
        )}
        
        <MobileActionSpacer />
      </main>

      <MobileTotalsBar />
    </div>
  )
}
