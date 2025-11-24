"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Copy, Plus, Undo2, Redo2, FilePlus2, Search, Calculator } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import type { Item } from "@/contexts/BillContext"
import { calculateItemSplits, getBillSummary } from "@/lib/calculations"
import { PersonSelector } from "@/components/PersonSelector"
import { SplitMethodSelector } from "@/components/SplitMethodSelector"
import { SplitMethodInput } from "@/components/SplitMethodInput"
import { TaxTipSection } from "@/components/TaxTipSection"
import { formatCurrency } from "@/lib/utils"
import { copyToClipboard, generateSummaryText } from "@/lib/export"
import { useToast } from "@/hooks/use-toast"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { SplitSimpleIcon } from "@/components/ProBillSplitter"
import { BillLookup } from "@/components/BillLookup"
import { ShareBill } from "@/components/ShareBill"
import { ReceiptScanner } from "@/components/ReceiptScanner"

export function MobileSpreadsheetView() {
  const { state, dispatch, canUndo, canRedo } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const summary = useMemo(() => getBillSummary(state.currentBill), [state.currentBill])
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [totalsOpen, setTotalsOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const items = state.currentBill.items
  const people = state.currentBill.people
  const currentItem = items[focusedIndex]

  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(Math.max(0, items.length - 1))
    }
  }, [items.length, focusedIndex])

  const handleAddItem = () => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        name: "",
        price: "",
        quantity: 1,
        splitWith: people.map((p) => p.id),
        method: "even",
      },
    })
    setFocusedIndex(items.length)
    analytics.trackFeatureUsed("mobile_add_item")
  }

  const handleUpdateItem = (updates: Partial<typeof currentItem>) => {
    if (!currentItem) return
    dispatch({
      type: "UPDATE_ITEM",
      payload: { ...currentItem, ...updates },
    })
  }

  const handleCopySummary = async () => {
    const summaryText = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(summaryText)
    if (success) {
      toast({ title: "Summary copied" })
      analytics.trackFeatureUsed("copy_summary_mobile")
    } else {
      toast({ title: "Copy failed", description: "Please try again", variant: "destructive" })
    }
  }

  const handleScanImport = (scannedItems: Omit<Item, "id" | "splitWith" | "method">[]) => {
    scannedItems.forEach((item) => {
      const newItem: Omit<Item, "id"> = {
        ...item,
        splitWith: people.map((p) => p.id),
        method: "even",
      }
      dispatch({ type: "ADD_ITEM", payload: newItem })
    })
    analytics.trackFeatureUsed("scan_receipt_import", { count: scannedItems.length })
    toast({ title: "Items added from scan" })
  }

  const personSplits = useMemo(() => {
    if (!currentItem) return {}
    return calculateItemSplits(currentItem, people)
  }, [currentItem, people])

  const handleNewBill = () => {
    if (confirm("Start a new bill? Current bill will be lost if not shared.")) {
      dispatch({ type: "NEW_BILL" })
      toast({ title: "New bill created" })
      setFocusedIndex(0)
      analytics.trackFeatureUsed("mobile_new_bill")
    }
  }

  const renderPersonAmounts = () => {
    if (!currentItem || people.length === 0) {
      return null
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Person shares</span>
          <span className="text-[10px] text-muted-foreground">{currentItem.splitWith.length} selected</span>
        </div>
        <div className="border border-border rounded-lg divide-y">
          {people.map((person) => {
            if (!currentItem.splitWith.includes(person.id)) return null
            const amount = personSplits[person.id] || 0
            return (
              <div key={person.id} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: person.color }} />
                  <span className="text-sm font-medium truncate">{person.name}</span>
                </div>
                <span className="text-sm font-mono">{formatCurrency(amount)}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderItemForm = () => {
    if (!currentItem) {
      return (
        <Card>
          <CardContent className="p-6 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">No items yet. Add your first item to start splitting.</p>
            <Button onClick={handleAddItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Item</p>
              <p className="text-base font-semibold">#{focusedIndex + 1} of {items.length}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onClick={() => setFocusedIndex((prev) => Math.max(0, prev - 1))}
                disabled={focusedIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onClick={() => setFocusedIndex((prev) => Math.min(items.length - 1, prev + 1))}
                disabled={focusedIndex >= items.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">Item name</label>
              <Input
                value={currentItem.name}
                onChange={(e) => handleUpdateItem({ name: e.target.value })}
                placeholder="e.g., Wheelchair"
                className="h-11 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  value={currentItem.quantity}
                  onChange={(e) => handleUpdateItem({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                  className="h-11"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Price</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={currentItem.price}
                  onChange={(e) => handleUpdateItem({ price: e.target.value })}
                  className="h-11"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency((parseFloat(currentItem.price || "0") || 0) * (currentItem.quantity || 1))}
              </span>
            </div>
          </div>

          <PersonSelector
            selectedPeople={currentItem.splitWith}
            onSelectionChange={(ids) => handleUpdateItem({ splitWith: ids })}
            size="md"
          />

          <SplitMethodSelector
            value={currentItem.method}
            onValueChange={(method) => handleUpdateItem({ method })}
            itemId={currentItem.id}
            peopleCount={people.length}
            assignedPeopleCount={currentItem.splitWith.length}
          />

          <SplitMethodInput
            item={currentItem}
            people={people}
            onCustomSplitsChange={(splits) => handleUpdateItem({ customSplits: splits })}
          />

          {renderPersonAmounts()}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <SplitSimpleIcon />
        <div className="flex-1">
          <Input
            value={state.currentBill.title}
            onChange={(e) => dispatch({ type: "SET_BILL_TITLE", payload: e.target.value })}
            className="h-9 text-base font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
          />
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">SplitSimple</p>
        </div>
        <div className="flex items-center gap-2">
          <ReceiptScanner onImport={handleScanImport} />
          <ShareBill variant="outline" size="sm" showText={false} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Grand total</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.total)}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{people.length} people</div>
                <div>{items.length} items</div>
              </div>
            </div>
            <Sheet open={totalsOpen} onOpenChange={setTotalsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  View breakdown
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Totals & People</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4">
                  <TaxTipSection />
                </div>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>

        {renderItemForm()}

      </main>

      <div className="sticky bottom-0 z-40 bg-white border-t px-4 pt-3 pb-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button variant="secondary" onClick={handleCopySummary}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Summary
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Button variant="outline" disabled={!canUndo} onClick={() => dispatch({ type: "UNDO" })}>
            <Undo2 className="h-4 w-4 mr-1" /> Undo
          </Button>
          <Button variant="outline" disabled={!canRedo} onClick={() => dispatch({ type: "REDO" })}>
            <Redo2 className="h-4 w-4 mr-1" /> Redo
          </Button>
          <Button variant="outline" onClick={handleNewBill}>
            <FilePlus2 className="h-4 w-4 mr-1" /> New
          </Button>
          <Sheet open={loadOpen} onOpenChange={setLoadOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Search className="h-4 w-4 mr-1" /> Load
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader className="pb-2">
                <SheetTitle>Load Bill</SheetTitle>
              </SheetHeader>
              <BillLookup mode="inline" />
            </SheetContent>
          </Sheet>
          <Button variant="outline" onClick={() => setTotalsOpen(true)}>
            <Calculator className="h-4 w-4 mr-1" /> Totals
          </Button>
        </div>
        <div className="mt-2">
          <ShareBill variant="default" size="sm" showText={true} />
        </div>
      </div>
    </div>
  )
}
