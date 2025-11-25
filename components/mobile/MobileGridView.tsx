"use client"

import { useMemo, useState } from "react"
import { Plus, Minus, Check, Trash2 } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import type { Item, Person } from "@/contexts/BillContext"
import { getBillSummary } from "@/lib/calculations"
import { formatCurrency, cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SplitMethodSelector } from "@/components/SplitMethodSelector"
import { PersonSelector } from "@/components/PersonSelector"

// Color palette for people (consistent with card view)
const COLORS = [
  { id: 'indigo', hex: '#4F46E5' },
  { id: 'orange', hex: '#F97316' },
  { id: 'rose', hex: '#F43F5E' },
  { id: 'emerald', hex: '#10B981' },
  { id: 'blue', hex: '#3B82F6' },
  { id: 'amber', hex: '#F59E0B' },
]

export function MobileGridView() {
  const { state, dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()

  const items = state.currentBill.items
  const people = state.currentBill.people
  const summary = useMemo(() => getBillSummary(state.currentBill), [state.currentBill])

  const [selectedCell, setSelectedCell] = useState<{
    itemId: string
    field: 'name' | 'quantity' | 'price' | 'person'
    personId?: string
  } | null>(null)

  const [editingItem, setEditingItem] = useState<Item | null>(null)

  // Add item handler
  const handleAddItem = () => {
    const newItem: Omit<Item, "id"> = {
      name: "",
      price: "",
      quantity: 1,
      splitWith: people.map((p) => p.id),
      method: "even",
    }
    dispatch({ type: "ADD_ITEM", payload: newItem })
    analytics.trackFeatureUsed("mobile_grid_add_item")
  }

  // Toggle person assignment
  const toggleAssignment = (itemId: string, personId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const isAssigned = item.splitWith.includes(personId)
    const newSplitWith = isAssigned
      ? item.splitWith.filter(id => id !== personId)
      : [...item.splitWith, personId]

    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, splitWith: newSplitWith }
    })
  }

  // Handle cell double-tap for editing
  const handleCellDoubleClick = (item: Item, field: string) => {
    if (field === 'name') {
      setEditingItem(item)
    }
  }

  // Update item handler
  const handleUpdateItem = (updates: Partial<Item>) => {
    if (!editingItem) return
    const updatedItem = { ...editingItem, ...updates }
    setEditingItem(updatedItem)
    dispatch({
      type: 'UPDATE_ITEM',
      payload: updatedItem
    })
  }

  // Delete item handler
  const handleDeleteItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId })
    setEditingItem(null)
    toast({ title: "Item deleted" })
  }

  // Calculate person totals
  const personTotals = useMemo(() => {
    const totals: Record<string, number> = {}

    people.forEach(person => {
      let total = 0
      items.forEach(item => {
        if (item.splitWith.includes(person.id)) {
          const itemPrice = parseFloat(item.price || "0") * (item.quantity || 1)
          const splitCount = item.splitWith.length
          total += splitCount > 0 ? itemPrice / splitCount : 0
        }
      })
      totals[person.id] = total
    })

    return totals
  }, [items, people])

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Grid Container with horizontal scroll */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full inline-block">
          <table className="w-full border-collapse">
            {/* Header */}
            <thead className="sticky top-0 z-20 bg-white border-b-2 border-slate-200">
              <tr>
                {/* Frozen Column Header */}
                <th className="sticky left-0 z-30 bg-slate-100 border-r border-slate-200 px-3 py-2 text-left">
                  <span className="text-xs font-bold uppercase text-slate-600">Item</span>
                </th>

                {/* Qty Header */}
                <th className="bg-slate-100 border-r border-slate-200 px-2 py-2 min-w-[60px]">
                  <span className="text-xs font-bold uppercase text-slate-600">Qty</span>
                </th>

                {/* Price Header */}
                <th className="bg-slate-100 border-r border-slate-200 px-2 py-2 min-w-[80px]">
                  <span className="text-xs font-bold uppercase text-slate-600">$</span>
                </th>

                {/* People Headers */}
                {people.map((person, idx) => (
                  <th
                    key={person.id}
                    className="bg-slate-100 border-r border-slate-200 px-2 py-2 min-w-[80px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="text-[9px] font-bold text-slate-700 truncate max-w-full">
                        {person.name.split(' ')[0]}
                      </span>
                    </div>
                  </th>
                ))}

                {/* Total Header */}
                <th className="sticky right-0 z-30 bg-slate-100 border-l-2 border-slate-300 px-2 py-2 min-w-[80px]">
                  <span className="text-xs font-bold uppercase text-slate-600">Total</span>
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {items.map((item, itemIdx) => {
                const itemTotal = (parseFloat(item.price || "0") || 0) * (item.quantity || 1)

                return (
                  <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                    {/* Frozen: Item Name */}
                    <td
                      className="sticky left-0 z-10 bg-white border-r border-slate-200 px-3 py-3 min-w-[120px] cursor-pointer hover:bg-slate-50"
                      onClick={() => setEditingItem(item)}
                    >
                      <div className="text-sm font-medium text-slate-900 line-clamp-2">
                        {item.name || <span className="text-slate-400 italic">Untitled</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Tap to edit</div>
                    </td>

                    {/* Quantity */}
                    <td className="bg-white border-r border-slate-200 px-2 py-3 text-center">
                      <span className="text-sm font-mono">{item.quantity}</span>
                    </td>

                    {/* Price */}
                    <td className="bg-white border-r border-slate-200 px-2 py-3 text-right">
                      <span className="text-sm font-mono">{parseFloat(item.price || "0").toFixed(2)}</span>
                    </td>

                    {/* People Cells */}
                    {people.map(person => {
                      const isAssigned = item.splitWith.includes(person.id)
                      const perPersonAmount = isAssigned && item.splitWith.length > 0
                        ? itemTotal / item.splitWith.length
                        : 0

                      return (
                        <td
                          key={person.id}
                          className={cn(
                            "border-r border-slate-200 px-2 py-3 cursor-pointer transition-colors",
                            isAssigned ? "bg-opacity-10" : "bg-white hover:bg-slate-50"
                          )}
                          style={{
                            backgroundColor: isAssigned ? `${person.color}20` : undefined
                          }}
                          onClick={() => toggleAssignment(item.id, person.id)}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            {isAssigned ? (
                              <>
                                <div
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: person.color }}
                                >
                                  ✓
                                </div>
                                <span className="text-[10px] font-mono font-medium">
                                  {formatCurrency(perPersonAmount)}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-300 text-lg">-</span>
                            )}
                          </div>
                        </td>
                      )
                    })}

                    {/* Total */}
                    <td className="sticky right-0 z-10 bg-white border-l-2 border-slate-300 px-2 py-3 text-right">
                      <span className="text-sm font-mono font-bold">{formatCurrency(itemTotal)}</span>
                    </td>
                  </tr>
                )
              })}

              {/* Add Row Button */}
              <tr className="border-b border-slate-200">
                <td
                  colSpan={3 + people.length + 1}
                  className="sticky left-0 bg-white px-3 py-2"
                >
                  <button
                    onClick={handleAddItem}
                    className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </button>
                </td>
              </tr>
            </tbody>

            {/* Footer with Totals */}
            <tfoot className="sticky bottom-0 z-20 bg-white border-t-2 border-slate-300">
              {/* Subtotal Row */}
              <tr className="bg-slate-50">
                <td className="sticky left-0 z-30 bg-slate-50 border-r border-slate-200 px-3 py-2 font-bold text-xs uppercase">
                  Subtotal
                </td>
                <td className="border-r border-slate-200" colSpan={2}></td>
                {people.map(person => (
                  <td key={person.id} className="border-r border-slate-200 px-2 py-2 text-center">
                    <span className="text-xs font-mono font-medium">
                      {formatCurrency(personTotals[person.id] || 0)}
                    </span>
                  </td>
                ))}
                <td className="sticky right-0 z-30 bg-slate-50 border-l-2 border-slate-300 px-2 py-2 text-right">
                  <span className="text-xs font-mono font-bold">
                    {formatCurrency(summary.subtotal)}
                  </span>
                </td>
              </tr>

              {/* Tax Row */}
              <tr className="bg-slate-50">
                <td className="sticky left-0 z-30 bg-slate-50 border-r border-slate-200 px-3 py-2 font-bold text-xs uppercase">
                  Tax
                </td>
                <td className="border-r border-slate-200" colSpan={2}>
                  <span className="text-xs font-mono">{formatCurrency(parseFloat(state.currentBill.tax || "0"))}</span>
                </td>
                {people.map(person => {
                  const ratio = summary.subtotal > 0 ? (personTotals[person.id] || 0) / summary.subtotal : 0
                  const personTax = parseFloat(state.currentBill.tax || "0") * ratio
                  return (
                    <td key={person.id} className="border-r border-slate-200 px-2 py-2 text-center">
                      <span className="text-xs font-mono">
                        {formatCurrency(personTax)}
                      </span>
                    </td>
                  )
                })}
                <td className="sticky right-0 z-30 bg-slate-50 border-l-2 border-slate-300 px-2 py-2 text-right">
                  <span className="text-xs font-mono font-bold">
                    {formatCurrency(parseFloat(state.currentBill.tax || "0"))}
                  </span>
                </td>
              </tr>

              {/* Grand Total Row */}
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="sticky left-0 z-30 bg-slate-100 border-r border-slate-200 px-3 py-2 font-bold text-xs uppercase">
                  Total
                </td>
                <td className="border-r border-slate-200" colSpan={2}></td>
                {people.map(person => {
                  const ratio = summary.subtotal > 0 ? (personTotals[person.id] || 0) / summary.subtotal : 0
                  const personTax = parseFloat(state.currentBill.tax || "0") * ratio
                  const personTip = parseFloat(state.currentBill.tip || "0") * ratio
                  const personTotal = (personTotals[person.id] || 0) + personTax + personTip

                  return (
                    <td key={person.id} className="border-r border-slate-200 px-2 py-2 text-center">
                      <div
                        className="inline-block px-2 py-1 rounded text-white text-xs font-mono font-bold"
                        style={{ backgroundColor: person.color }}
                      >
                        {formatCurrency(personTotal)}
                      </div>
                    </td>
                  )
                })}
                <td className="sticky right-0 z-30 bg-slate-100 border-l-2 border-slate-300 px-2 py-2 text-right">
                  <span className="text-sm font-mono font-bold">
                    {formatCurrency(summary.total)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Item Edit Sheet */}
      <Sheet open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
          {editingItem && (
            <>
              <SheetHeader className="p-4 border-b sticky top-0 bg-white z-10">
                <SheetTitle>Edit Item</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-4">
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
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleUpdateItem({ quantity: Math.max(1, editingItem.quantity - 1) })}
                        className="h-11 w-11"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={editingItem.quantity}
                        onChange={(e) => handleUpdateItem({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className="h-11 text-center text-lg font-bold"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleUpdateItem({ quantity: editingItem.quantity + 1 })}
                        className="h-11 w-11"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Price</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editingItem.price}
                      onChange={(e) => handleUpdateItem({ price: e.target.value })}
                      className="h-11 text-base"
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

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (confirm('Delete this item?')) {
                        handleDeleteItem(editingItem.id)
                      }
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
    </div>
  )
}
