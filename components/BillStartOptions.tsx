"use client"

import { useMemo, useState } from "react"
import { Camera, FileText, PencilLine, ArrowRight, Calculator, Percent, Scale, DollarSign, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReceiptScanner } from "@/components/ReceiptScanner"
import { buildManualItemizedBill, buildQuickSplitBill, type QuickSplitMode } from "@/lib/bill-start"
import { useBill } from "@/contexts/BillContext"
import type { Item, ReceiptLineItem } from "@/lib/bill-types"
import { useToast } from "@/hooks/use-toast"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { cn } from "@/lib/utils"

interface BillStartOptionsProps {
  className?: string
  compact?: boolean
  layout?: "sidebar" | "grid"
}

interface QuickSplitParticipantDraft {
  id: string
  name: string
  shares: string
  exactAmount: string
}

function createParticipantDraft(index: number): QuickSplitParticipantDraft {
  return {
    id: `participant-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    shares: "1",
    exactAmount: "",
  }
}

function parseCurrencyValue(value: string) {
  // Strip thousands separators so "1,200" parses as 1200 rather than parseFloat
  // stopping at the comma and silently yielding 1.
  const trimmed = value.trim().replace(/,/g, "")
  if (!trimmed) return 0
  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : NaN
}

export function BillStartOptions({ className, compact = false, layout = "sidebar" }: BillStartOptionsProps) {
  const { state, dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const [manualOpen, setManualOpen] = useState(false)
  const [manualMode, setManualMode] = useState<"menu" | "quick">("menu")
  const [manualTitle, setManualTitle] = useState("Manual Split")
  const [quickTitle, setQuickTitle] = useState("Quick Split")
  const [quickAmount, setQuickAmount] = useState("")
  const [quickTax, setQuickTax] = useState("")
  const [quickTip, setQuickTip] = useState("")
  const [quickDiscount, setQuickDiscount] = useState("")
  const [quickSplitMode, setQuickSplitMode] = useState<QuickSplitMode>("even")
  const [participants, setParticipants] = useState<QuickSplitParticipantDraft[]>([
    createParticipantDraft(0),
    createParticipantDraft(1),
  ])

  const handleScanImport = (items: ReceiptLineItem[]) => {
    items.forEach((item) => {
      const newItem: Omit<Item, "id"> = {
        ...item,
        splitWith: state.currentBill.people.map((person) => person.id),
        method: "even",
      }
      dispatch({ type: "ADD_ITEM", payload: newItem })
    })

    analytics.trackFeatureUsed("start_flow_receipt_import", { count: items.length })
  }

  const resetManualFlow = () => {
    setManualMode("menu")
    setManualTitle("Manual Split")
    setQuickTitle("Quick Split")
    setQuickAmount("")
    setQuickTax("")
    setQuickTip("")
    setQuickDiscount("")
    setQuickSplitMode("even")
    setParticipants([createParticipantDraft(0), createParticipantDraft(1)])
  }

  const namedParticipants = useMemo(
    () => participants.filter((participant) => participant.name.trim().length > 0),
    [participants]
  )

  const quickAmountValue = parseCurrencyValue(quickAmount)
  const quickTaxValue = parseCurrencyValue(quickTax)
  const quickTipValue = parseCurrencyValue(quickTip)
  const quickDiscountValue = parseCurrencyValue(quickDiscount)

  const exactMismatch = useMemo(() => {
    if (quickSplitMode !== "exact" || !Number.isFinite(quickAmountValue)) {
      return null
    }

    const exactTotal = namedParticipants.reduce((sum, participant) => {
      const amount = parseCurrencyValue(participant.exactAmount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)

    const difference = Math.round((exactTotal - quickAmountValue) * 100) / 100
    return Math.abs(difference) <= 0.01 ? null : difference
  }, [namedParticipants, quickAmountValue, quickSplitMode])

  const quickSplitError = useMemo(() => {
    if (namedParticipants.length < 2) {
      return "Add at least 2 people for a quick split."
    }

    if (!quickAmount.trim()) {
      return "Enter the amount you want to split."
    }

    if (!Number.isFinite(quickAmountValue) || quickAmountValue <= 0) {
      return "Enter a valid amount greater than 0."
    }

    if ([quickTaxValue, quickTipValue, quickDiscountValue].some((value) => Number.isNaN(value))) {
      return "Use valid numbers for tax, tip, and discount."
    }

    if (quickSplitMode === "shares") {
      const hasInvalidShare = namedParticipants.some((participant) => {
        const shareValue = parseCurrencyValue(participant.shares)
        return !Number.isFinite(shareValue) || shareValue <= 0
      })

      if (hasInvalidShare) {
        return "Every person needs a positive share value."
      }
    }

    if (quickSplitMode === "exact") {
      const hasInvalidAmount = namedParticipants.some((participant) => {
        const exactAmount = parseCurrencyValue(participant.exactAmount)
        return !Number.isFinite(exactAmount) || exactAmount < 0
      })

      if (hasInvalidAmount) {
        return "Every person needs a valid exact amount."
      }

      if (exactMismatch !== null) {
        return "Exact amounts must add up to the amount being split."
      }
    }

    return null
  }, [
    exactMismatch,
    namedParticipants,
    quickAmount,
    quickAmountValue,
    quickDiscountValue,
    quickSplitMode,
    quickTaxValue,
    quickTipValue,
  ])

  const startManualItemized = () => {
    dispatch({
      type: "LOAD_BILL",
      payload: {
        bill: buildManualItemizedBill(manualTitle),
        source: "draft",
      },
    })
    analytics.trackFeatureUsed("start_manual_itemized")
    toast({
      title: "Manual bill ready",
      description: "We added a starter person and 3 blank rows so you can type right away.",
      variant: "success",
    })
    setManualOpen(false)
    resetManualFlow()
  }

  const startQuickSplit = () => {
    if (quickSplitError) return

    dispatch({
      type: "LOAD_BILL",
      payload: {
        bill: buildQuickSplitBill({
          title: quickTitle,
          amount: quickAmountValue,
          tax: quickTaxValue,
          tip: quickTipValue,
          discount: quickDiscountValue,
          splitMode: quickSplitMode,
          allocation: "proportional",
          participants: namedParticipants.map((participant) => ({
            name: participant.name,
            shares: parseCurrencyValue(participant.shares),
            exactAmount: parseCurrencyValue(participant.exactAmount),
          })),
        }),
        source: "draft",
      },
    })

    analytics.trackFeatureUsed("start_quick_split", {
      split_mode: quickSplitMode,
      people_count: namedParticipants.length,
      has_adjustments: Boolean(quickTax.trim() || quickTip.trim() || quickDiscount.trim()),
    })
    toast({
      title: "Quick split ready",
      description: "You can review the totals immediately or itemize later if the group wants more precision.",
      variant: "success",
    })
    setManualOpen(false)
    resetManualFlow()
  }

  const updateParticipant = (id: string, field: keyof QuickSplitParticipantDraft, value: string) => {
    setParticipants((current) =>
      current.map((participant) => (participant.id === id ? { ...participant, [field]: value } : participant))
    )
  }

  const addParticipant = () => {
    setParticipants((current) => [...current, createParticipantDraft(current.length)])
  }

  const removeParticipant = (id: string) => {
    setParticipants((current) => (current.length > 2 ? current.filter((participant) => participant.id !== id) : current))
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <p className="text-xs text-muted-foreground">
          No receipt needed. Start with a photo, copied order text, or a manual split.
        </p>

        <div
          className={cn(
            "gap-3",
            layout === "grid"
              ? compact
                ? "grid grid-cols-1"
                : "grid grid-cols-1 md:grid-cols-3"
              : "flex flex-col"
          )}
        >
          <ReceiptScanner
            initialTab="image"
            onImport={handleScanImport}
            trigger={(
              <button type="button" className="w-full text-left">
                <StartOptionButton
                  icon={Camera}
                  title="Scan receipt"
                  description="Use a photo when you have the bill in front of you."
                  layout={layout}
                />
              </button>
            )}
          />

          <ReceiptScanner
            initialTab="text"
            onImport={handleScanImport}
            trigger={(
              <button type="button" className="w-full text-left">
                <StartOptionButton
                  icon={FileText}
                  title="Paste order text"
                  description="Great for copied order summaries, notes, or chat messages."
                  layout={layout}
                />
              </button>
            )}
          />

          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="w-full text-left"
          >
            <StartOptionButton
              icon={PencilLine}
              title="Enter manually"
              description="Type items yourself or build a quick split without a receipt."
              layout={layout}
            />
          </button>
        </div>
      </div>

      <Dialog
        open={manualOpen}
        onOpenChange={(open) => {
          setManualOpen(open)
          if (!open) {
            resetManualFlow()
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          {manualMode === "menu" ? (
            <>
              <DialogHeader>
                <DialogTitle>Enter Manually</DialogTitle>
                <DialogDescription>
                  Choose the fastest path for the information you have right now.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setManualMode("quick")}
                  className="rounded-2xl border border-border bg-slate-50 p-5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="mb-3 inline-flex rounded-xl bg-white p-2 shadow-sm">
                    <Calculator className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="font-semibold text-foreground">Quick split total</div>
                    <p className="text-sm text-muted-foreground">
                      Best when you just know the total and want an answer fast.
                    </p>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    Set up quick split <ArrowRight className="h-4 w-4" />
                  </div>
                </button>

                <div className="rounded-2xl border border-border bg-slate-50 p-5">
                  <div className="mb-4 inline-flex rounded-xl bg-white p-2 shadow-sm">
                    <PencilLine className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold text-foreground">Itemized bill</div>
                      <p className="text-sm text-muted-foreground">
                        Start with blank rows if you want fairness by item from the beginning.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-title">Bill title</Label>
                      <Input
                        id="manual-title"
                        value={manualTitle}
                        onChange={(event) => setManualTitle(event.target.value)}
                        placeholder="Manual Split"
                      />
                    </div>

                    <Button type="button" className="w-full" onClick={startManualItemized}>
                      Start itemized bill
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Quick Split Total</DialogTitle>
                <DialogDescription>
                  This creates one shared line item now, and you can itemize it later if the group wants more detail.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quick-title">Bill title</Label>
                    <Input
                      id="quick-title"
                      value={quickTitle}
                      onChange={(event) => setQuickTitle(event.target.value)}
                      placeholder="Quick Split"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-amount">Amount to split</Label>
                    <Input
                      id="quick-amount"
                      inputMode="decimal"
                      value={quickAmount}
                      onChange={(event) => setQuickAmount(event.target.value)}
                      placeholder="86.42"
                    />
                    <p className="text-xs text-muted-foreground">
                      If this already includes tax and tip, leave the fields below blank.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="quick-tax">Tax</Label>
                    <Input
                      id="quick-tax"
                      inputMode="decimal"
                      value={quickTax}
                      onChange={(event) => setQuickTax(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick-tip">Tip</Label>
                    <Input
                      id="quick-tip"
                      inputMode="decimal"
                      value={quickTip}
                      onChange={(event) => setQuickTip(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick-discount">Discount</Label>
                    <Input
                      id="quick-discount"
                      inputMode="decimal"
                      value={quickDiscount}
                      onChange={(event) => setQuickDiscount(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-split-mode">Split style</Label>
                  <Select value={quickSplitMode} onValueChange={(value) => setQuickSplitMode(value as QuickSplitMode)}>
                    <SelectTrigger id="quick-split-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="even">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Split evenly
                        </div>
                      </SelectItem>
                      <SelectItem value="shares">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Weighted shares
                        </div>
                      </SelectItem>
                      <SelectItem value="exact">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Exact amounts
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">People</h3>
                      <p className="text-xs text-muted-foreground">
                        Add everyone involved in the split.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add person
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {participants.map((participant, index) => (
                      <div key={participant.id} className="rounded-xl border border-border bg-slate-50 p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`participant-name-${participant.id}`}>Person {index + 1}</Label>
                            <Input
                              id={`participant-name-${participant.id}`}
                              value={participant.name}
                              onChange={(event) => updateParticipant(participant.id, "name", event.target.value)}
                              placeholder={`Person ${index + 1}`}
                            />
                          </div>

                          {participants.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-6 shrink-0"
                              onClick={() => removeParticipant(participant.id)}
                              aria-label={`Remove person ${index + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {quickSplitMode === "shares" && (
                          <div className="mt-3 space-y-2">
                            <Label htmlFor={`participant-share-${participant.id}`}>Share weight</Label>
                            <Input
                              id={`participant-share-${participant.id}`}
                              inputMode="decimal"
                              value={participant.shares}
                              onChange={(event) => updateParticipant(participant.id, "shares", event.target.value)}
                              placeholder="1"
                            />
                          </div>
                        )}

                        {quickSplitMode === "exact" && (
                          <div className="mt-3 space-y-2">
                            <Label htmlFor={`participant-exact-${participant.id}`}>Exact amount</Label>
                            <Input
                              id={`participant-exact-${participant.id}`}
                              inputMode="decimal"
                              value={participant.exactAmount}
                              onChange={(event) => updateParticipant(participant.id, "exactAmount", event.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {quickSplitError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {quickSplitError}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" onClick={() => setManualMode("menu")}>
                    Back
                  </Button>
                  <Button type="button" onClick={startQuickSplit} disabled={Boolean(quickSplitError)}>
                    Create quick split
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function StartOptionButton({
  icon: Icon,
  title,
  description,
  layout,
}: {
  icon: typeof Camera
  title: string
  description: string
  layout: "sidebar" | "grid"
}) {
  const isSidebar = layout === "sidebar"

  return (
    <span
      className={cn(
        "block h-full rounded-2xl border border-border bg-slate-50 transition-colors hover:border-primary/50 hover:bg-primary/5",
        isSidebar ? "p-4" : "p-5"
      )}
    >
      <span
        className={cn(
          "inline-flex rounded-xl bg-white shadow-sm",
          isSidebar ? "p-2.5" : "mb-3 p-2"
        )}
      >
        <Icon className="h-5 w-5 text-primary" />
      </span>

      {isSidebar ? (
        <span className="mt-3 flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-foreground">{title}</span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground text-pretty">{description}</span>
          </span>
        </span>
      ) : (
        <>
          <span className="block font-semibold text-foreground">{title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
        </>
      )}
    </span>
  )
}
