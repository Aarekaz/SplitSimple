"use client"

import React from "react"
import { LedgerItemsTable } from "@/components/LedgerItemsTable"
import { MobileLedgerView } from "@/components/MobileLedgerView"
import { TotalsPanel } from "@/components/TotalsPanel"
import { MobileTotalsBar } from "@/components/MobileTotalsBar"
import { MobileFirstUI } from "@/components/MobileFirstUI"
import { MobileActionButton, MobileActionSpacer } from "@/components/MobileActionButton"
import { ShareBill } from "@/components/ShareBill"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Receipt, Plus, Copy, Share2, Users } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { generateSummaryText, copyToClipboard } from "@/lib/export"
import { useState, useEffect, useRef } from "react"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { useIsMobile } from "@/hooks/use-mobile"
import { BillStatusIndicator } from "@/components/BillStatusIndicator"
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

  const handleNewBill = React.useCallback(() => {
    dispatch({ type: "NEW_BILL" })
    analytics.trackBillCreated()
    analytics.trackFeatureUsed("new_bill")
  }, [dispatch, analytics])

  const handleCopySummary = React.useCallback(async () => {
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
  }, [state.currentBill, toast, analytics])

  const handleAddPerson = () => {
    setIsAddingPerson(true)
    analytics.trackFeatureUsed("mobile_add_person")
  }

  const handleAddItem = () => {
    analytics.trackFeatureUsed("mobile_add_item")
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }

      // N: Add new item (desktop only, handled by LedgerItemsTable)
      // P: Add person
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        setIsAddingPerson(true)
        analytics.trackFeatureUsed("keyboard_shortcut_add_person")
      }

      // C: Copy summary
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        handleCopySummary()
        analytics.trackFeatureUsed("keyboard_shortcut_copy")
      }

      // S: Share (handled by ShareBill component, but we track it)
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        analytics.trackFeatureUsed("keyboard_shortcut_share")
        // ShareBill component will handle the actual share action
        document.querySelector('[aria-label*="Share"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }

      // Cmd/Ctrl + N: New bill
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleNewBill()
        analytics.trackFeatureUsed("keyboard_shortcut_new_bill")
      }

      // Cmd/Ctrl + Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
        analytics.trackFeatureUsed("keyboard_shortcut_undo")
      }

      // Cmd/Ctrl + Shift + Z: Redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        dispatch({ type: 'REDO' })
        analytics.trackFeatureUsed("keyboard_shortcut_redo")
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, analytics, handleCopySummary, handleNewBill, setIsAddingPerson])

  return (
    <div className="min-h-screen pb-32">
      {/* Receipt-Style Header */}
      <header className="glass-header px-4 py-3 sticky top-0 z-50">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: App branding & Receipt ID */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="text-receipt-header hidden sm:inline">SPLITSIMPLE</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <span className="text-receipt-id">#{state.currentBill.id.slice(0, 8).toUpperCase()}</span>
            </div>

            {/* Center: Bill Title */}
            <div className="flex-1 min-w-0 max-w-md">
              <Input
                ref={titleInputRef}
                value={state.currentBill.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled Bill"
                className="text-receipt-title h-9 w-full border-2 border-border bg-card text-foreground px-3 hover:border-primary/50 focus:border-primary transition-all font-ui"
              />
            </div>

            {/* Right: Status & Sync */}
            <div className="flex items-center gap-3">
              <BillStatusIndicator compact={true} showSelector={true} />
              <SyncStatusIndicator compact />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Receipt Container */}
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Items Section - LEFT */}
          <div className="space-y-4">
            {isMobile && state.currentBill.people.length === 0 ? (
              <MobileFirstUI />
            ) : state.currentBill.people.length > 0 ? (
              <>
                {/* Desktop: Ledger Grid Table */}
                <div className="hidden lg:block">
                  <LedgerItemsTable />
                </div>
                {/* Mobile: Compact Ledger View */}
                <div className="lg:hidden">
                  <MobileLedgerView />
                </div>
              </>
            ) : (
              <div className="receipt-container p-12">
                <div className="text-center max-w-md mx-auto">
                  <div className="mx-auto h-16 w-16 border-2 border-border flex items-center justify-center mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-receipt-title mb-3">
                    {isNewBillFlow ? "Welcome to SplitSimple!" : "Add people to your bill"}
                  </h2>
                  <p className="text-receipt-label mb-6">
                    {isNewBillFlow
                      ? "Give your bill a name above, then add the people who are splitting costs."
                      : isMobile
                      ? "Add the people who are splitting this bill. Tap 'View Details' below to get started."
                      : "Add the people who are splitting this bill. You'll be able to assign them to items and choose how to split costs."}
                  </p>
                  {!isMobile && !isNewBillFlow && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Quick tip</p>
                      <div className="flex items-center justify-center gap-2">
                        <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">P</kbd>
                        <span className="text-[11px] text-muted-foreground">Press P to add a person</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Totals Panel - RIGHT */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
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
              <TooltipContent side="top">Copy Summary (C)</TooltipContent>
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
              <TooltipContent side="top">New Bill (⌘N)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS BAR - Desktop Only */}
      {!isMobile && state.currentBill.people.length > 0 && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="receipt-container px-4 py-2 pointer-events-auto">
            <div className="flex items-center gap-6 text-xs font-receipt text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">N</kbd>
                <span>New item</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">P</kbd>
                <span>Add person</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">C</kbd>
                <span>Copy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">S</kbd>
                <span>Share</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">⌘Z</kbd>
                <span>Undo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">⌘⇧Z</kbd>
                <span>Redo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-3 text-xs text-muted-foreground border-t-2 border-border bg-background/95 backdrop-blur-sm z-40 pointer-events-none font-receipt">
        <div className="container mx-auto max-w-5xl flex justify-between items-center">
          <span className="pointer-events-auto">
            Crafted by{' '}
            <a
              href="https://anuragd.me"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-primary transition-colors underline"
            >
              anuragdhungana
            </a>
          </span>
          <a
            href="https://github.com/aarekaz/splitsimple"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-primary transition-colors pointer-events-auto underline"
          >
            View Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}