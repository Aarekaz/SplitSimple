"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type React from "react"

import { CollapsibleItemsTable } from "@/components/CollapsibleItemsTable"
import { TotalsPanel } from "@/components/TotalsPanel"
import { MobileTotalsBar } from "@/components/MobileTotalsBar"
import { ShareBill } from "@/components/ShareBill"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
    toast({
      title: "Import coming soon",
      description: "CSV import is on the roadmap.",
    })
    analytics.trackFeatureUsed("control_import")
  }

  const controlActions: ControlAction[] = useMemo(
    () => [
      {
        label: "Add Person",
        icon: UserPlus,
        tooltip: "Invite someone to the split",
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
        <div className="mx-auto flex w-full max-w-[1640px] flex-wrap items-center gap-5 px-8 py-6">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-2">
                <Receipt className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="micro-label text-xs">Workspace</p>
                <p className="text-sm font-semibold tracking-wide text-foreground">SplitSimple</p>
              </div>
            </div>
            <div className="hidden h-9 w-px bg-border lg:block" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="micro-label text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
                Bill
              </p>
              <Input
                ref={titleInputRef}
                value={state.currentBill.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Name this bill"
                className="h-10 w-full rounded-md border border-border bg-surface-2 px-4 py-2.5 text-base font-semibold tracking-wide text-foreground transition focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              className="border border-border bg-surface-2 font-semibold tracking-[0.18em] uppercase text-xs"
              onClick={handleNewBill}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="border-t border-border/60 bg-surface-1/80">
          <div className="mx-auto flex w-full max-w-[1640px] flex-wrap items-center gap-3 px-8 py-3">
            <span className="command-chip">
              People <strong>{state.currentBill.people.length}</strong>
            </span>
            <span className="command-chip">
              Items <strong>{state.currentBill.items.length}</strong>
            </span>
            <span className="command-chip">
              Status <strong className="capitalize">{state.currentBill.status}</strong>
            </span>
            {state.currentBill.lastModified && (
              <span className="command-chip">
                Updated <strong>{new Date(state.currentBill.lastModified).toLocaleString()}</strong>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="mx-auto grid w-full max-w-[1640px] gap-6 px-8 pt-10 pb-4 lg:grid-cols-[240px_minmax(0,1fr)_340px]">
          <aside className="control-rail">
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
                  className="control-button"
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
            {state.currentBill.people.length === 0 && state.currentBill.items.length === 0 ? (
              <div className="panel p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="micro-label text-[0.65rem] text-muted-foreground">Getting started</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight">Invite your first person</h2>
                  <p className="mt-2 max-w-md text-sm text-card-foreground">
                    SplitSimple works best when everyone is in the room. Add the first person, then start
                    logging the items you are sharing.
                  </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddPerson}
                    className="border border-accent bg-transparent text-xs font-semibold uppercase tracking-[0.18em]"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Person
                  </Button>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="panel bg-surface-2 p-4">
                    <p className="micro-label text-[0.65rem] text-muted-foreground">Step 1</p>
                    <p className="mt-2 font-semibold">Add the people</p>
                    <p className="text-sm text-card-foreground">Use the control rail or the totals panel.</p>
                  </div>
                  <div className="panel bg-surface-2 p-4">
                    <p className="micro-label text-[0.65rem] text-muted-foreground">Step 2</p>
                    <p className="mt-2 font-semibold">Capture items</p>
                    <p className="text-sm text-card-foreground">Log each line item and assign participants.</p>
                  </div>
                </div>
              </div>
            ) : null}

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

            <CollapsibleItemsTable />
          </section>

          <aside className="panel flex h-fit flex-col gap-4 p-5 lg:sticky lg:top-[112px]">
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
                className="border border-border bg-surface-2 text-xs font-semibold uppercase tracking-[0.18em]"
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

        <MobileTotalsBar />
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
    </div>
  )
}
