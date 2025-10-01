"use client"

import type React from "react"

import { CollapsibleItemsTable } from "@/components/CollapsibleItemsTable"
import { TotalsPanel } from "@/components/TotalsPanel"
import { MobileTotalsBar } from "@/components/MobileTotalsBar"
import { MobileFirstUI } from "@/components/MobileFirstUI"
import { MobileActionButton, MobileActionSpacer } from "@/components/MobileActionButton"
import { ShareBill } from "@/components/ShareBill"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Receipt, Plus, Copy, Share2 } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { generateSummaryText, copyToClipboard } from "@/lib/export"
import { useState, useEffect, useRef } from "react"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import { BillStatusIndicator } from "@/components/BillStatusIndicator"
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator"
import { Users } from "lucide-react"

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
      setIsInitialLoad(false)
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
    
    if (newTitle !== previousTitle) {
      setPreviousTitle(newTitle)
    }
  }

  useEffect(() => {
    if (previousTitle !== state.currentBill.title && previousTitle !== "New Bill") {
      const timeoutId = setTimeout(() => {
        analytics.trackTitleChanged(state.currentBill.title)
      }, 1000)
      
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
    analytics.trackFeatureUsed("mobile_add_item")
  }


  return (
    <div className="min-h-screen pb-32">
      {/* Minimal Header with Glass Effect */}
      <header className="glass-header px-4 py-3 sticky top-0 z-50">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Minimal Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">SplitSimple</span>
              </div>
              <div className="w-px h-6 bg-border/30" />
              <Input
                ref={titleInputRef}
                value={state.currentBill.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled Bill"
                className="text-title h-10 w-40 sm:w-56 border-0 bg-muted/30 text-foreground px-3 rounded-xl hover:bg-muted/50 focus:bg-card focus:shadow-md transition-all duration-200 font-semibold"
              />
            </div>

            {/* Right: Status Only */}
            <div className="flex items-center gap-2">
              <BillStatusIndicator compact={true} showSelector={true} />
              <SyncStatusIndicator compact />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Canvas with floating cards (ORIGINAL LAYOUT) */}
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 lg:gap-6">
          {/* Items Section - LEFT */}
          <div className="space-y-5">
            {isMobile && state.currentBill.people.length === 0 ? (
              <MobileFirstUI />
            ) : state.currentBill.people.length > 0 ? (
              <CollapsibleItemsTable />
            ) : (
              <Card className="float-card p-12 border-0">
                <CardHeader className="text-center p-0">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-title mb-3">
                    {isNewBillFlow ? "Welcome to SplitSimple!" : "Who's splitting the bill?"}
                  </CardTitle>
                  <p className="text-subtitle max-w-md mx-auto">
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

          {/* Totals Panel - RIGHT - RESTORED! */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="float-panel border-0 p-5">
                <TotalsPanel
                  isAddingPerson={isAddingPerson}
                  setIsAddingPerson={setIsAddingPerson}
                  personInputRef={personInputRef}
                />
              </div>
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

      {/* FLOATING DOCK - Bottom Center (Desktop Only) */}
      {!isMobile && state.currentBill.people.length > 0 && (
        <div className="floating-dock">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleCopySummary}
                  className="dock-item"
                  aria-label="Copy Summary"
                >
                  <Copy className="h-5 w-5 text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Copy Summary</TooltipContent>
            </Tooltip>

            <ShareBill variant="ghost" size="sm" showText={false} />

            <div className="dock-divider" />

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleNewBill}
                  className="dock-item"
                  aria-label="New Bill"
                >
                  <Plus className="h-5 w-5 text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">New Bill</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* FOOTER - Bottom Left & Right */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-3 text-xs text-muted-foreground border-t border-border/30 bg-background/80 backdrop-blur-sm z-40 pointer-events-none">
        <div className="container mx-auto max-w-5xl flex justify-between items-center">
          <span className="pointer-events-auto">
            Crafted by{' '}
            <a
              href="https://anuragd.me"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-primary transition-colors"
            >
              anuragdhungana
            </a>
          </span>
          <a
            href="https://github.com/aarekaz/splitsimple"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-primary transition-colors pointer-events-auto"
          >
            View Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}