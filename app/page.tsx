"use client"

import React from "react"
import dynamic from "next/dynamic"
import { LedgerItemsTable } from "@/components/LedgerItemsTable"
import { MobileLedgerView } from "@/components/MobileLedgerView"
import { PeopleBreakdownTable } from "@/components/PeopleBreakdownTable"
import { TaxTipSection } from "@/components/TaxTipSection"
import { TotalsPanel } from "@/components/TotalsPanel"
import { MobileTotalsBar } from "@/components/MobileTotalsBar"
import { MobileFirstUI } from "@/components/MobileFirstUI"
import { MobileActionButton, MobileActionSpacer } from "@/components/MobileActionButton"
import { BillLookup } from "@/components/BillLookup"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Receipt, Plus, Copy, Share2, Users, Download } from "lucide-react"
import { getBillFromCloud } from "@/lib/sharing"
import { useBill } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { generateSummaryText, copyToClipboard } from "@/lib/export"
import { migrateBillSchema } from "@/lib/validation"
import { useState, useEffect, useRef } from "react"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { useIsMobile } from "@/hooks/use-mobile"
import { BillStatusIndicator } from "@/components/BillStatusIndicator"
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator"
import { TIMING } from "@/lib/constants"

// Lazy load heavy components
const ShareBill = dynamic(() => import("@/components/ShareBill").then(mod => ({ default: mod.ShareBill })), {
  loading: () => <Button size="sm" disabled><Share2 className="h-3.5 w-3.5" /></Button>
})

const KeyboardShortcutsHelp = dynamic(() => import("@/components/KeyboardShortcutsHelp").then(mod => ({ default: mod.KeyboardShortcutsHelp })), {
  loading: () => null
})

export default function HomePage() {
  const { state, dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showLoadBillDialog, setShowLoadBillDialog] = useState(false)
  const [loadBillId, setLoadBillId] = useState("")
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

  // Listen for bill load events from BillContext
  useEffect(() => {
    const handleBillLoaded = (event: Event) => {
      const customEvent = event as CustomEvent
      const { title, people, items } = customEvent.detail
      toast({
        title: "Bill loaded!",
        description: `"${title}" with ${people} people and ${items} items`,
      })
      analytics.trackFeatureUsed("load_shared_bill_success")
    }

    const handleBillLoadFailed = (event: Event) => {
      const customEvent = event as CustomEvent
      const { billId, error } = customEvent.detail
      toast({
        title: "Failed to load bill",
        description: error || `Bill ${billId.slice(0, 8)}... not found or expired`,
        variant: "destructive",
      })
      analytics.trackError("load_shared_bill_failed", error || "Bill not found")
    }

    window.addEventListener('bill-loaded-success', handleBillLoaded)
    window.addEventListener('bill-load-failed', handleBillLoadFailed)

    return () => {
      window.removeEventListener('bill-loaded-success', handleBillLoaded)
      window.removeEventListener('bill-load-failed', handleBillLoadFailed)
    }
  }, [toast, analytics])

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

  const handleLoadBill = async () => {
    if (!loadBillId.trim()) {
      toast({
        title: "Enter a bill ID",
        description: "Please enter a valid bill ID to load",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await getBillFromCloud(loadBillId.trim())

      if (result.bill) {
        // Migration: Add missing fields
        const migratedBill = migrateBillSchema(result.bill)

        dispatch({ type: "LOAD_BILL", payload: migratedBill })
        setShowLoadBillDialog(false)
        setLoadBillId("")

        toast({
          title: "Bill loaded!",
          description: `"${result.bill.title}" with ${result.bill.people.length} people and ${result.bill.items.length} items`,
        })
        analytics.trackFeatureUsed("manual_load_bill")
      } else {
        toast({
          title: "Bill not found",
          description: result.error || "The bill ID may be invalid or expired",
          variant: "destructive",
        })
        analytics.trackError("manual_load_bill_failed", result.error || "Bill not found")
      }
    } catch (error) {
      toast({
        title: "Error loading bill",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
      analytics.trackError("manual_load_bill_error", error instanceof Error ? error.message : "Unknown error")
    }
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
        toast({
          title: "Undo",
          description: "Previous action has been undone",
          duration: TIMING.TOAST_SHORT,
        })
        analytics.trackFeatureUsed("keyboard_shortcut_undo")
      }

      // Cmd/Ctrl + Shift + Z: Redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        dispatch({ type: 'REDO' })
        toast({
          title: "Redo",
          description: "Action has been restored",
          duration: TIMING.TOAST_SHORT,
        })
        analytics.trackFeatureUsed("keyboard_shortcut_redo")
      }

      // ?: Show keyboard shortcuts help
      if (e.key === '?') {
        e.preventDefault()
        setShowShortcutsHelp(true)
        analytics.trackFeatureUsed("keyboard_shortcut_help")
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, analytics, handleCopySummary, handleNewBill, setIsAddingPerson, state.currentBill.people])

  return (
    <div className="min-h-screen pb-32">
      {/* Receipt-Style Header */}
      <header className="glass-header px-4 py-3 sticky top-0 z-50" role="banner" aria-label="Bill header">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: App branding & Receipt ID */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2" role="img" aria-label="SplitSimple logo">
                <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="text-receipt-header hidden sm:inline" aria-label="Application name">SPLITSIMPLE</span>
              </div>
              <div className="w-px h-5 bg-border" aria-hidden="true" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        copyToClipboard(state.currentBill.id)
                        toast({
                          title: "Bill ID copied!",
                          description: `Full ID: ${state.currentBill.id}`,
                          duration: 3000,
                        })
                      }}
                      className="text-receipt-id hover:text-primary transition-colors cursor-pointer"
                      aria-label="Copy full bill ID"
                    >
                      #{state.currentBill.id.slice(0, 8).toUpperCase()}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-mono text-xs">
                    <p className="font-semibold mb-1">Click to copy full Bill ID</p>
                    <p className="text-muted-foreground">{state.currentBill.id}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Center: Bill Title */}
            <div className="flex-1 min-w-0 max-w-md">
              <Input
                ref={titleInputRef}
                value={state.currentBill.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled Bill"
                aria-label="Bill title"
                className="text-receipt-title h-9 w-full border-2 border-border bg-card text-foreground px-3 hover:border-primary/50 focus:border-primary transition-all font-ui"
              />
            </div>

            {/* Right: Status & Sync */}
            <div className="flex items-center gap-3" role="group" aria-label="Bill status and sync controls">
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
              <KeyboardShortcutsHelp />
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

              <div className="pointer-events-auto">
                <button
                  onClick={() => {
                    // Trigger the ShareBill button directly
                    document.getElementById('share-bill-trigger')?.click()
                  }}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  title="Share bill"
                >
                  <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-colors">S</kbd>
                  <span>Share</span>
                </button>
                {/* Hidden ShareBill trigger with id */}
                <div className="hidden">
                  <ShareBill id="share-bill-trigger" variant="ghost" size="sm" showText={false} />
                </div>
              </div>

              <div className="w-px h-4 bg-border" />

              {/* Load Bill Dialog */}
              <Dialog open={showLoadBillDialog} onOpenChange={setShowLoadBillDialog}>
                <DialogTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                    title="Load bill by ID"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Load</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Load Bill by ID</DialogTitle>
                    <DialogDescription>
                      Enter a bill ID to load a shared bill. You can find the bill ID in the share URL (after ?bill=)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="1763442653885-vlpkbu4"
                        value={loadBillId}
                        onChange={(e) => setLoadBillId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleLoadBill()
                          }
                        }}
                        className="font-mono text-sm"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        Example: If the URL is <code className="px-1 bg-muted rounded">?bill=1763442653885-vlpkbu4</code>,<br />
                        enter <code className="px-1 bg-muted rounded">1763442653885-vlpkbu4</code>
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowLoadBillDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleLoadBill}>
                        Load Bill
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="w-px h-4 bg-border" />

              <button
                onClick={() => {
                  dispatch({ type: 'UNDO' })
                  toast({
                    title: "Undo",
                    description: "Previous action has been undone",
                    duration: TIMING.TOAST_SHORT,
                  })
                }}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                title="Undo"
              >
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded text-[10px] font-medium border border-border/50 transition-colors">⌘Z</kbd>
                <span>Undo</span>
              </button>

              <button
                onClick={() => {
                  dispatch({ type: 'REDO' })
                  toast({
                    title: "Redo",
                    description: "Action has been restored",
                    duration: TIMING.TOAST_SHORT,
                  })
                }}
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
        <div className="container mx-auto max-w-5xl">
          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center gap-4">
            <BillLookup />
            <div className="flex items-center gap-4">
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
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <BillLookup />
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="pointer-events-auto">
                Crafted by{' '}
                <a
                  href="https://anuragd.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary transition-colors underline"
                >
                  anuragd
                </a>
              </span>
              <a
                href="https://github.com/aarekaz/splitsimple"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-primary transition-colors pointer-events-auto underline"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}