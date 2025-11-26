"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Undo2,
  Redo2,
  FilePlus2,
  Search,
  Calculator,
  MoreVertical,
  Users as UsersIcon,
  Receipt,
  FileText,
  ChevronDown,
  Trash2,
  Check,
  UserPlus,
  Edit2
} from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import type { Item, Person } from "@/contexts/BillContext"
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
import { cn } from "@/lib/utils"

// Color palette for people
const COLORS = [
  { id: 'indigo', bg: 'bg-indigo-100', solid: 'bg-indigo-600', text: 'text-indigo-700', textSolid: 'text-white', hex: '#4F46E5' },
  { id: 'orange', bg: 'bg-orange-100', solid: 'bg-orange-500', text: 'text-orange-700', textSolid: 'text-white', hex: '#F97316' },
  { id: 'rose', bg: 'bg-rose-100', solid: 'bg-rose-500', text: 'text-rose-700', textSolid: 'text-white', hex: '#F43F5E' },
  { id: 'emerald', bg: 'bg-emerald-100', solid: 'bg-emerald-500', text: 'text-emerald-700', textSolid: 'text-white', hex: '#10B981' },
  { id: 'blue', bg: 'bg-blue-100', solid: 'bg-blue-500', text: 'text-blue-700', textSolid: 'text-white', hex: '#3B82F6' },
  { id: 'amber', bg: 'bg-amber-100', solid: 'bg-amber-500', text: 'text-amber-700', textSolid: 'text-white', hex: '#F59E0B' },
]

export function MobileCardView() {
  const { state, dispatch, canUndo, canRedo } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const summary = useMemo(() => getBillSummary(state.currentBill), [state.currentBill])

  const [activeTab, setActiveTab] = useState<"items" | "split" | "summary">("items")
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [peopleManagementOpen, setPeopleManagementOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)

  const items = state.currentBill.items
  const people = state.currentBill.people

  const handleAddItem = () => {
    const newItem: Omit<Item, "id"> = {
      name: "",
      price: "",
      quantity: 1,
      splitWith: people.map((p) => p.id),
      method: "even",
    }
    dispatch({ type: "ADD_ITEM", payload: newItem })

    // Open the newly added item for editing
    setTimeout(() => {
      const newItems = [...items, { ...newItem, id: `temp-${Date.now()}` }]
      setEditingItem(newItems[newItems.length - 1] as Item)
    }, 100)

    analytics.trackFeatureUsed("mobile_add_item")
  }

  const handleUpdateItem = (updates: Partial<Item>) => {
    if (!editingItem) return
    const updatedItem = { ...editingItem, ...updates }
    setEditingItem(updatedItem)
    dispatch({
      type: "UPDATE_ITEM",
      payload: updatedItem,
    })
  }

  const handleDeleteItem = (itemId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId })
    setEditingItem(null)
    toast({ title: "Item deleted" })
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

  const handleNewBill = () => {
    if (confirm("Start a new bill? Current bill will be lost if not shared.")) {
      dispatch({ type: "NEW_BILL" })
      toast({ title: "New bill created" })
      analytics.trackFeatureUsed("mobile_new_bill")
    }
    setMenuOpen(false)
  }

  const handleAddPerson = () => {
    const newName = `Person ${people.length + 1}`
    dispatch({
      type: "ADD_PERSON",
      payload: {
        name: newName,
        color: COLORS[people.length % COLORS.length].hex
      }
    })
    analytics.trackPersonAdded("manual")
    toast({ title: "Person added", description: newName })
  }

  const handleUpdatePerson = (updatedPerson: Person) => {
    dispatch({
      type: "UPDATE_PERSON",
      payload: updatedPerson
    })
    toast({
      title: "Person updated",
      description: `${updatedPerson.name}'s details updated`
    })
    analytics.trackFeatureUsed("update_person")
    setEditingPerson(null)
  }

  const handleRemovePerson = (personId: string) => {
    const person = people.find(p => p.id === personId)
    const hadItems = items.some(i => i.splitWith.includes(personId))
    dispatch({ type: "REMOVE_PERSON", payload: personId })
    if (person) {
      analytics.trackPersonRemoved(hadItems)
      toast({ title: "Person removed", description: person.name })
    }
    setEditingPerson(null)
  }

  // Calculate person totals
  const personTotals = useMemo(() => {
    const totals: Record<string, {
      subtotal: number
      tax: number
      tip: number
      discount: number
      total: number
      ratio: number
      items: Item[]
    }> = {}

    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price || "0")
      return sum + (price * (item.quantity || 1))
    }, 0)

    const taxAmount = parseFloat(state.currentBill.tax || "0")
    const tipAmount = parseFloat(state.currentBill.tip || "0")
    const discountAmount = parseFloat(state.currentBill.discount || "0")

    people.forEach(person => {
      let personSubtotal = 0
      const personItems: Item[] = []

      items.forEach(item => {
        if (item.splitWith.includes(person.id)) {
          const itemPrice = parseFloat(item.price || "0") * (item.quantity || 1)
          const splitCount = item.splitWith.length
          const personShare = splitCount > 0 ? itemPrice / splitCount : 0
          personSubtotal += personShare
          personItems.push(item)
        }
      })

      const ratio = subtotal > 0 ? personSubtotal / subtotal : 0
      const personTax = taxAmount * ratio
      const personTip = tipAmount * ratio
      const personDiscount = discountAmount * ratio
      const personTotal = personSubtotal + personTax + personTip - personDiscount

      totals[person.id] = {
        subtotal: personSubtotal,
        tax: personTax,
        tip: personTip,
        discount: personDiscount,
        total: personTotal,
        ratio: ratio * 100,
        items: personItems
      }
    })

    return totals
  }, [items, people, state.currentBill.tax, state.currentBill.tip, state.currentBill.discount])

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      {/* Grand Total Card - Always Visible */}
      <div className="bg-white border-b px-4 py-4">
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
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
        <div className="bg-white border-b px-4 pt-2">
          <TabsList className="w-full h-10 bg-slate-100">
            <TabsTrigger value="items" className="flex-1">
              <Receipt className="h-4 w-4" />
              <span>Items</span>
            </TabsTrigger>
            <TabsTrigger value="split" className="flex-1">
              <UsersIcon className="h-4 w-4" />
              <span>Split</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex-1">
              <FileText className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {/* ITEMS TAB */}
          <TabsContent value="items" className="h-full overflow-y-auto px-4 py-4 space-y-3 m-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                All Items ({items.length})
              </h3>
              <Button size="sm" onClick={handleAddItem} className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {items.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <div className="text-4xl">📝</div>
                  <div>
                    <p className="font-semibold mb-1">No items yet</p>
                    <p className="text-sm text-muted-foreground">Add your first item to start splitting</p>
                  </div>
                  <Button onClick={handleAddItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const totalPrice = (parseFloat(item.price || "0") || 0) * (item.quantity || 1)
                  const assignedPeople = people.filter(p => item.splitWith.includes(p.id))

                  return (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setEditingItem(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                              <h4 className="font-semibold truncate">
                                {item.name || <span className="text-muted-foreground italic">Untitled item</span>}
                              </h4>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Qty: {item.quantity}
                            </div>
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {assignedPeople.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">Not assigned</span>
                              ) : assignedPeople.length === people.length ? (
                                <span className="text-xs font-medium text-primary">All</span>
                              ) : (
                                assignedPeople.slice(0, 3).map(person => (
                                  <span
                                    key={person.id}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100"
                                  >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: person.color }} />
                                    {person.name.split(' ')[0]}
                                  </span>
                                ))
                              )}
                              {assignedPeople.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{assignedPeople.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{formatCurrency(totalPrice)}</div>
                            <div className="text-xs text-muted-foreground">
                              @ {formatCurrency(parseFloat(item.price || "0"))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
                          <span>Tap to edit</span>
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* SPLIT TAB */}
          <TabsContent value="split" className="h-full overflow-y-auto px-4 py-4 space-y-3 m-0">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Who Owes What
            </h3>

            {people.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <div className="text-4xl">👥</div>
                  <div>
                    <p className="font-semibold mb-1">No people added</p>
                    <p className="text-sm text-muted-foreground">Add people to split the bill</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {people.map(person => {
                  const personData = personTotals[person.id]
                  if (!personData) return null

                  return (
                    <Card key={person.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        {/* Person Header */}
                        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: person.color }}
                            >
                              {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold">{person.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {personData.ratio.toFixed(1)}% of bill
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{formatCurrency(personData.total)}</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="px-4 py-3 bg-slate-50/50">
                          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-200">
                            <div
                              className="h-full transition-all rounded-full"
                              style={{
                                width: `${personData.ratio}%`,
                                backgroundColor: person.color
                              }}
                            />
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="p-4 space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Items ({personData.items.length})
                          </div>
                          {personData.items.slice(0, 5).map(item => {
                            const itemPrice = parseFloat(item.price || "0") * (item.quantity || 1)
                            const perPerson = item.splitWith.length > 0 ? itemPrice / item.splitWith.length : 0

                            return (
                              <div key={item.id} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground truncate flex-1">
                                  • {item.name || "Untitled"}
                                </span>
                                <span className="font-mono font-medium ml-2">{formatCurrency(perPerson)}</span>
                              </div>
                            )
                          })}
                          {personData.items.length > 5 && (
                            <div className="text-xs text-muted-foreground italic">
                              ... +{personData.items.length - 5} more items
                            </div>
                          )}

                          {/* Totals */}
                          <div className="pt-3 mt-3 border-t space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="font-mono">{formatCurrency(personData.subtotal)}</span>
                            </div>
                            {personData.tax > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax</span>
                                <span className="font-mono">{formatCurrency(personData.tax)}</span>
                              </div>
                            )}
                            {personData.tip > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tip</span>
                                <span className="font-mono">{formatCurrency(personData.tip)}</span>
                              </div>
                            )}
                            {personData.discount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-destructive">Discount</span>
                                <span className="font-mono text-destructive">-{formatCurrency(personData.discount)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* SUMMARY TAB */}
          <TabsContent value="summary" className="h-full overflow-y-auto m-0">
            <TaxTipSection />
          </TabsContent>
        </div>
      </Tabs>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 z-40 bg-white border-t px-4 pt-3 pb-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
        <div className="flex gap-2 mb-3">
          <Button onClick={handleCopySummary} className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            Copy Summary
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!canUndo} onClick={() => dispatch({ type: "UNDO" })} className="flex-1">
            <Undo2 className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button variant="outline" size="sm" disabled={!canRedo} onClick={() => dispatch({ type: "REDO" })} className="flex-1">
            <Redo2 className="h-4 w-4 mr-1" />
            Redo
          </Button>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <MoreVertical className="h-4 w-4 mr-1" />
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[60vh]">
              <SheetHeader className="pb-4">
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start h-12" onClick={handleNewBill}>
                  <FilePlus2 className="h-4 w-4 mr-3" />
                  New Bill
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-12">
                      <Search className="h-4 w-4 mr-3" />
                      Load Bill
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
                    <SheetHeader className="pb-2">
                      <SheetTitle>Load Bill</SheetTitle>
                    </SheetHeader>
                    <BillLookup mode="inline" />
                  </SheetContent>
                </Sheet>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={() => {
                    setMenuOpen(false)
                    setPeopleManagementOpen(true)
                  }}
                >
                  <UsersIcon className="h-4 w-4 mr-3" />
                  Manage People
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Item Edit Sheet */}
      <Sheet open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto p-0">
          {editingItem && (
            <>
              <SheetHeader className="p-4 border-b sticky top-0 bg-white z-10">
                <SheetTitle>Edit Item</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-5">
                {/* Item Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Item name</label>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => handleUpdateItem({ name: e.target.value })}
                    placeholder="e.g., Masoori Rice"
                    className="h-11 text-base"
                    autoFocus
                  />
                </div>

                {/* Quantity and Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      value={editingItem.quantity}
                      onChange={(e) => handleUpdateItem({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Price</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editingItem.price}
                      onChange={(e) => handleUpdateItem({ price: e.target.value })}
                      className="h-11"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between bg-slate-100 rounded-lg px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</span>
                  <span className="text-xl font-bold">
                    {formatCurrency((parseFloat(editingItem.price || "0") || 0) * (editingItem.quantity || 1))}
                  </span>
                </div>

                {/* Person Selector */}
                <PersonSelector
                  selectedPeople={editingItem.splitWith}
                  onSelectionChange={(ids) => handleUpdateItem({ splitWith: ids })}
                  size="md"
                />

                {/* Split Method */}
                <SplitMethodSelector
                  value={editingItem.method}
                  onValueChange={(method) => handleUpdateItem({ method })}
                  itemId={editingItem.id}
                  peopleCount={people.length}
                  assignedPeopleCount={editingItem.splitWith.length}
                />

                {/* Custom Split Input */}
                <SplitMethodInput
                  item={editingItem}
                  people={people}
                  onCustomSplitsChange={(splits) => handleUpdateItem({ customSplits: splits })}
                />

                {/* Person Amounts Preview */}
                {editingItem.splitWith.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Person shares
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {editingItem.splitWith.length} selected
                      </span>
                    </div>
                    <div className="border border-border rounded-lg divide-y">
                      {people.map((person) => {
                        if (!editingItem.splitWith.includes(person.id)) return null
                        const personSplits = calculateItemSplits(editingItem, people)
                        const amount = personSplits[person.id] || 0

                        return (
                          <div key={person.id} className="flex items-center justify-between px-3 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: person.color }} />
                              <span className="text-sm font-medium truncate">{person.name}</span>
                            </div>
                            <span className="text-sm font-mono font-bold">{formatCurrency(amount)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleDeleteItem(editingItem.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setEditingItem(null)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* People Management Sheet */}
      <Sheet open={peopleManagementOpen} onOpenChange={setPeopleManagementOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-white z-10">
            <SheetTitle>Manage People</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {/* Add Person Button */}
            <Button onClick={handleAddPerson} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Person
            </Button>

            {/* People List */}
            {people.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <div className="text-4xl">👥</div>
                  <div>
                    <p className="font-semibold mb-1">No people yet</p>
                    <p className="text-sm text-muted-foreground">Add people to split expenses</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide px-1">
                  {people.length} {people.length === 1 ? 'Person' : 'People'}
                </p>
                {people.map((person, index) => (
                  <Card
                    key={person.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setEditingPerson(person)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{person.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {personTotals[person.id] ? (
                              <>Owes {formatCurrency(personTotals[person.id].total)}</>
                            ) : (
                              'No items assigned'
                            )}
                          </p>
                        </div>
                        <div className="text-muted-foreground">
                          <Edit2 className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Person Edit Sheet */}
      <Sheet open={!!editingPerson} onOpenChange={(open) => !open && setEditingPerson(null)}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto p-0">
          {editingPerson && (
            <>
              <SheetHeader className="p-4 border-b sticky top-0 bg-white z-10">
                <SheetTitle>Edit Person</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-5">
                {/* Person Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Name</label>
                  <Input
                    value={editingPerson.name}
                    onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                    placeholder="e.g., John Doe"
                    className="h-11 text-base"
                    autoFocus
                  />
                </div>

                {/* Color Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Color</label>
                  <div className="grid grid-cols-6 gap-3">
                    {COLORS.map((colorOption, idx) => (
                      <button
                        key={idx}
                        onClick={() => setEditingPerson({
                          ...editingPerson,
                          color: colorOption.hex,
                          colorIdx: idx
                        })}
                        className={cn(
                          "w-full aspect-square rounded-lg transition-all",
                          editingPerson.color === colorOption.hex
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: colorOption.hex }}
                      >
                        {editingPerson.color === colorOption.hex && (
                          <Check className="h-5 w-5 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Person Stats */}
                {personTotals[editingPerson.id] && (
                  <div className="bg-slate-100 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Current Bill
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Amount</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(personTotals[editingPerson.id].total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Items</span>
                      <span>{personTotals[editingPerson.id].items.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Share of Bill</span>
                      <span>{personTotals[editingPerson.id].ratio.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (confirm(`Remove ${editingPerson.name}? They will be unassigned from all items.`)) {
                        handleRemovePerson(editingPerson.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleUpdatePerson(editingPerson)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
