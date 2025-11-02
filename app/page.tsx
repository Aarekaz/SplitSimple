"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type React from "react"

import { CollapsibleItemsTable } from "@/components/CollapsibleItemsTable"
import { TotalsPanel } from "@/components/TotalsPanel"
import { ShareBill } from "@/components/ShareBill"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Activity,
  ClipboardList,
  Copy,
  LayoutDashboard,
  ListPlus,
  Receipt,
  RefreshCcw,
  UserPlus,
  FileDown,
} from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import type { Item } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { generateSummaryText, copyToClipboard } from "@/lib/export"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { BillStatusIndicator } from "@/components/BillStatusIndicator"
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator"
import { ThemeToggle } from "@/components/ThemeToggle"
import { ImportDialog } from "@/components/ImportDialog"

interface ControlAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  tooltip?: string
  onExecute: () => void
  active?: boolean
  disabled?: boolean
}

export default function HomePage() {
  const { state, dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()

  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const personInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
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
      }, 800)

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
        title: "Nothing to copy",
        description: "Add people and items first.",
        variant: "destructive",
      })
      analytics.trackError("copy_summary_failed", "No data to copy")
      return
    }

    const summaryText = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(summaryText)

    if (success) {
      toast({
        title: "Summary copied",
        description: "Share it anywhere.",
      })
      analytics.trackBillSummaryCopied()
      analytics.trackFeatureUsed("copy_summary")
    } else {
      toast({
        title: "Copy failed",
        description: "Clipboard API rejected the operation.",
        variant: "destructive",
      })
      analytics.trackError("copy_summary_failed", "Clipboard API failed")
    }
  }

  const handleAddPerson = () => {
    setIsAddingPerson(true)
    analytics.trackFeatureUsed("control_add_person")
  }

  const handleAddItem = () => {
    const payload: Omit<Item, "id"> = {
      name: "",
      price: "",
      quantity: 1,
      splitWith: state.currentBill.people.map((person) => person.id),
      method: "even",
    }
    dispatch({ type: "ADD_ITEM", payload })
    analytics.trackFeatureUsed("control_add_item")
  }

  const handleImport = () => {
    setShowImportDialog(true)
    analytics.trackFeatureUsed("control_import")
  }

  const controlActions: ControlAction[] = useMemo(
    () => [
      {
        label: "Add Person",
        icon: UserPlus,
        tooltip: isAddingPerson ? "Click to cancel adding person" : "Click to add a new person to the bill",
        onExecute: handleAddPerson,
        active: isAddingPerson,
      },
      {
        label: "Add Item",
        icon: ListPlus,
        tooltip: "Capture a new line item",
        onExecute: handleAddItem,
        disabled: state.currentBill.people.length === 0,
      },
      {
        label: "Import",
        icon: FileDown,
        tooltip: "Upload CSV (soon)",
        onExecute: handleImport,
      },
      {
        label: "Copy Summary",
        icon: ClipboardList,
        tooltip: "Copy the full split breakdown",
        onExecute: handleCopySummary,
        disabled: state.currentBill.people.length === 0,
      },
    ],
    [
      handleAddItem,
      handleAddPerson,
      handleCopySummary,
      handleImport,
      isAddingPerson,
      state.currentBill.people.length,
    ]
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="command-header sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-[1640px] items-center gap-4 px-8 py-3.5">
          {/* Workspace Branding */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2">
              <Receipt className="h-4 w-4 text-accent" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">SplitSimple</span>
          </div>

          <div className="hidden h-6 w-px bg-border lg:block" />

          {/* Bill Title Input - Prominent */}
          <div className="flex min-w-0 flex-1 items-center">
            <Input
              ref={titleInputRef}
              value={state.currentBill.title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Name this bill"
              className="h-9 w-full rounded-md border border-border bg-surface-2 px-3.5 text-base font-semibold tracking-tight text-foreground transition focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
            />
          </div>

          {/* Stats Chips - Inline & Compact */}
          <div className="hidden items-center gap-2 lg:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="text-foreground">{state.currentBill.people.length}</span> People
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="text-foreground">{state.currentBill.items.length}</span> Items
            </span>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <BillStatusIndicator compact showSelector />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Change bill status</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <SyncStatusIndicator compact />
            <ThemeToggle />
            <ShareBill variant="ghost" size="sm" showText={false} />
            <Button
              variant="outline"
              size="sm"
              className="h-8 border border-border bg-surface-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em]"
              onClick={handleNewBill}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Mobile-First Layout */}
        <div className="mx-auto w-full max-w-[1640px] px-4 pt-6 pb-24 sm:px-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_340px] lg:gap-6 lg:pt-10 lg:pb-4">

          {/* Desktop: Control Rail */}
          <aside className="hidden lg:block control-rail">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              <LayoutDashboard className="h-4 w-4" />
              Controls
            </div>
            {controlActions.map((action) => {
              const Icon = action.icon
              const button = (
                <button
                  key={action.label}
                  data-active={action.active}
                  data-action={action.label.toLowerCase().replace(/\s+/g, '-')}
                  className="control-button rainbow-border-hover"
                  disabled={action.disabled}
                  onClick={action.onExecute}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </button>
              )

              if (action.tooltip) {
                return (
                  <TooltipProvider key={action.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12}>
                        {action.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              }

              return button
            })}
          </aside>

          <section className="flex min-w-0 flex-col gap-6">
            {/* Simplified Mobile-First Onboarding */}
            {state.currentBill.people.length === 0 && state.currentBill.items.length === 0 ? (
              <div className="panel p-8 lg:p-10">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-primary/15 animate-pulse">
                    <UserPlus className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Welcome to SplitSimple</h2>
                    <p className="text-base text-muted-foreground">
                      Tap the <strong>green "Add"</strong> button below to add your first person
                  </p>
                  </div>
                  <div className="pt-2">
                  <Button
                      size="lg"
                    onClick={handleAddPerson}
                      className="rainbow-border-hover text-base h-14 px-8"
                  >
                      <UserPlus className="mr-2 h-5 w-5" />
                      Add First Person
                  </Button>
                  </div>
                </div>
              </div>
            ) : state.currentBill.people.length > 0 && state.currentBill.items.length === 0 ? (
              <div className="panel p-8 lg:p-10">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-primary/15 animate-pulse">
                    <ListPlus className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Great! {state.currentBill.people.length} {state.currentBill.people.length === 1 ? 'person added' : 'people added'}</h2>
                    <p className="text-base text-muted-foreground">
                      Now tap the <strong>green "Add Item"</strong> button to log your first expense
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      size="lg"
                      onClick={handleAddItem}
                      className="rainbow-border-hover text-base h-14 px-8"
                    >
                      <ListPlus className="mr-2 h-5 w-5" />
                      Add First Item
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Section Header - Only show when items exist */}
            {state.currentBill.items.length > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="micro-label text-[0.65rem] text-muted-foreground">Items ledger</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">Breakdown</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Copy className="h-3 w-3" />
                {state.currentBill.items.length} total lines recorded
              </div>
            </div>
            )}

            <CollapsibleItemsTable />
            
            {/* Mobile: Inline Totals - Hide this, we'll use bottom sheet */}
          </section>

          {/* Desktop: Totals Panel */}
          <aside className="hidden lg:block panel flex h-fit flex-col gap-4 p-5 sticky top-[76px]">
            <div className="flex items-center justify-between">
              <p className="micro-label">Totals</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <TotalsPanel
              isAddingPerson={isAddingPerson}
              setIsAddingPerson={setIsAddingPerson}
              personInputRef={personInputRef}
              compact
            />
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                className="border border-border bg-surface-2 text-xs font-semibold uppercase tracking-[0.18em] rainbow-border-hover"
                onClick={handleCopySummary}
                disabled={state.currentBill.people.length === 0}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Copy Summary
              </Button>
              <ShareBill variant="outline" size="sm" />
            </div>
          </aside>
        </div>

        {/* Mobile: Unified Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-1 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] sm:hidden">
          <div className="flex h-20 items-center justify-around px-2 py-3">
            {/* Left: Totals Button - Always First Action */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-surface-2 hover:text-foreground rainbow-border-hover min-w-[64px]">
                  <Activity className="h-5 w-5" />
                  <span>Totals</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="flex max-h-[85vh] flex-col rounded-t-[28px] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Bill Summary</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto p-6 pt-8">
                  <TotalsPanel
                    compact
                    isAddingPerson={isAddingPerson}
                    setIsAddingPerson={setIsAddingPerson}
                    personInputRef={personInputRef}
                  />
                  <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
                    <Button
                      variant="secondary"
                      className="w-full border border-border bg-surface-2 text-xs font-semibold uppercase tracking-[0.18em] rainbow-border-hover"
                      onClick={handleCopySummary}
                      disabled={state.currentBill.people.length === 0}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Copy Summary
                    </Button>
                      <div className="w-full">
                        <ShareBill variant="outline" size="default" />
                      </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Center: Primary Action Button */}
            {state.currentBill.people.length === 0 ? (
              <button
                onClick={handleAddPerson}
                className="flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground bg-primary transition-all hover:bg-primary/90 shadow-lg rainbow-border-hover min-w-[80px]"
              >
                <UserPlus className="h-5 w-5" />
                <span>Add</span>
              </button>
            ) : (
              <button
                onClick={handleAddItem}
                className="flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground bg-primary transition-all hover:bg-primary/90 shadow-lg rainbow-border-hover min-w-[80px]"
              >
                <ListPlus className="h-5 w-5" />
                <span>Add Item</span>
              </button>
            )}

            {/* Right: People Count/Quick Access */}
            <button
              className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-surface-2 hover:text-foreground rainbow-border-hover min-w-[64px]"
              onClick={() => setIsAddingPerson(true)}
            >
              <UserPlus className="h-5 w-5" />
              <span>{state.currentBill.people.length}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Corner Text Elements - Desktop Only */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden lg:block">
        <div className="mx-auto flex w-full max-w-[1640px] items-end justify-between px-8 pb-10">
          {/* Bottom Left */}
          <div className="pointer-events-auto text-xs text-muted-foreground/60 transition-colors-moderate hover:text-muted-foreground">
            SplitSimple: Splitting made easy
          </div>

          {/* Bottom Right */}
          <div className="pointer-events-auto flex items-center gap-2 text-xs text-muted-foreground/60">
            <span>Made by</span>
            <a
              href="https://anuragd.me"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline-offset-2 transition-colors-moderate hover:text-foreground hover:underline"
            >
              Anurag
            </a>
            <span>•</span>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline-offset-2 transition-colors-moderate hover:text-foreground hover:underline"
            >
              View code here
            </a>
          </div>
        </div>
      </div>
      
      {/* Import Dialog */}
      <ImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
    </div>
  )
}
