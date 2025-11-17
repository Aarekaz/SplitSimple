"use client"

import React from "react"
import { LedgerItemsTable } from "@/components/LedgerItemsTable"
import { MobileLedgerView } from "@/components/MobileLedgerView"
import { PeopleBreakdownTable } from "@/components/PeopleBreakdownTable"
import { TaxTipSection } from "@/components/TaxTipSection"
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

      // N: Add new item
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        const newItem = {
          name: "",
          price: "",
          quantity: 1,
          splitWith: state.currentBill.people.map((p) => p.id),
          method: "even" as const,
        }
        dispatch({ type: "ADD_ITEM", payload: newItem })
        analytics.trackFeatureUsed("keyboard_shortcut_add_item")
      }

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

      // S: Share
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        analytics.trackFeatureUsed("keyboard_shortcut_share")
        document.getElementById('share-bill-trigger')?.click()
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
  }, [dispatch, analytics, handleCopySummary, handleNewBill, setIsAddingPerson, state.currentBill.people])

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
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-6xl">
        {/* Vertical Stack Layout */}
        <div className="space-y-6">
          {/* Mobile First UI */}
          {isMobile && state.currentBill.people.length === 0 ? (
            <MobileFirstUI />
          ) : null}

          {/* Desktop Layout - Always show on desktop */}
          {!isMobile && (
            <>
              {/* Section 1: People Breakdown - Always visible */}
              <PeopleBreakdownTable
                isAddingPerson={isAddingPerson}
                setIsAddingPerson={setIsAddingPerson}
                personInputRef={personInputRef}
              />

              {/* Section 2: Items Ledger - Only when people exist - Staggered animation */}
              {state.currentBill.people.length > 0 && (
                <div className="animate-slide-in-1">
                  <LedgerItemsTable />
                </div>
              )}

              {/* Section 3: Payment Summary - Only when people exist - Staggered animation */}
              {state.currentBill.people.length > 0 && (
                <div className="animate-slide-in-2">
                  <TaxTipSection />
                </div>
              )}
            </>
          )}

          {/* Mobile Ledger - Only when people exist */}
          {isMobile && state.currentBill.people.length > 0 && (
            <MobileLedgerView />
          )}
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

      {/* KEYBOARD SHORTCUTS BAR - Desktop Only */}
      {!isMobile && state.currentBill.people.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="receipt-container px-4 py-2 pointer-events-auto">
            <div className="flex items-center gap-6 text-xs font-receipt text-muted-foreground">
              <button
                onClick={() => {
                  const newItem = {
                    name: "",
                    price: "",
                    quantity: 1,
                    splitWith: state.currentBill.people.map((p) => p.id),
                    method: "even" as const,
                  }
                  dispatch({ type: "ADD_ITEM", payload: newItem })
                  analytics.trackFeatureUsed("keyboard_shortcut_add_item")
                }}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                title="Add new item"
              >
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-colors">N</kbd>
                <span>New item</span>
              </button>

              <button
                onClick={() => setIsAddingPerson(true)}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                title="Add person"
              >
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-colors">P</kbd>
                <span>Add person</span>
              </button>

              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                title="Copy summary"
              >
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-colors">C</kbd>
                <span>Copy</span>
              </button>

              <div className="pointer-events-auto relative">
                <button
                  onClick={() => {
                    // Trigger the hidden ShareBill button
                    document.getElementById('share-bill-trigger')?.click()
                  }}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  title="Share bill"
                >
                  <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-colors">S</kbd>
                  <span>Share</span>
                </button>
                {/* Hidden ShareBill trigger */}
                <div className="hidden">
                  <div id="share-bill-trigger">
                    <ShareBill variant="ghost" size="sm" showText={false} />
                  </div>
                </div>
              </div>

              <div className="w-px h-4 bg-border" />

              <button
                onClick={() => dispatch({ type: 'UNDO' })}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                title="Undo"
              >
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-colors">⌘Z</kbd>
                <span>Undo</span>
              </button>

              <button
                onClick={() => dispatch({ type: 'REDO' })}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                title="Redo"
              >
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-colors">⌘⇧Z</kbd>
                <span>Redo</span>
              </button>
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