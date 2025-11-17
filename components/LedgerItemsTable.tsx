"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2, Check, AlertCircle, Edit2, Receipt, Split, BarChart2, Percent, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useBill } from "@/contexts/BillContext"
import { PersonSelector } from "./PersonSelector"
import { SplitMethodSelector } from "./SplitMethodSelector"
import { SplitMethodInput } from "./SplitMethodInput"
import { TaxTipSection } from "./TaxTipSection"
import { calculateItemSplits, getBillSummary } from "@/lib/calculations"
import { validateCurrencyInput } from "@/lib/validation"
import { formatCurrency } from "@/lib/utils"
import type { Item, Person } from "@/contexts/BillContext"

function getSplitMethodLabel(method: "even" | "shares" | "percent" | "exact"): string {
  const labels = {
    even: "EVEN",
    shares: "SHARES",
    percent: "%",
    exact: "EXACT"
  }
  return labels[method]
}

function getSplitMethodIcon(method: "even" | "shares" | "percent" | "exact") {
  const icons = {
    even: Split,
    shares: BarChart2,
    percent: Percent,
    exact: DollarSign
  }
  return icons[method]
}

function getSplitMethodColor(method: "even" | "shares" | "percent" | "exact"): string {
  const colors = {
    even: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    shares: "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    percent: "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    exact: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
  }
  return colors[method]
}

function getNextSplitMethod(current: "even" | "shares" | "percent" | "exact"): "even" | "shares" | "percent" | "exact" {
  const cycle: Array<"even" | "shares" | "percent" | "exact"> = ["even", "shares", "percent", "exact"]
  const currentIndex = cycle.indexOf(current)
  return cycle[(currentIndex + 1) % cycle.length]
}

function getItemValidationStatus(item: Item): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (!item.name || item.name.trim() === "") {
    warnings.push("Item name is missing")
  }

  if (!item.price || parseFloat(item.price) <= 0) {
    warnings.push("Price is required")
  }

  if (item.splitWith.length === 0) {
    warnings.push("No one assigned")
  }

  if (item.method === "percent" && item.customSplits) {
    const totalPercent = Object.values(item.customSplits).reduce((sum, val) => sum + val, 0)
    if (Math.abs(totalPercent - 100) > 0.01) {
      warnings.push("% must add to 100")
    }
  }

  if (item.method === "exact" && item.customSplits) {
    const totalExact = Object.values(item.customSplits).reduce((sum, val) => sum + val, 0)
    const itemTotal = parseFloat(item.price) * (item.quantity || 1)
    if (Math.abs(totalExact - itemTotal) > 0.01) {
      warnings.push("Exact amounts must equal total")
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  }
}

export function LedgerItemsTable() {
  const { state, dispatch } = useBill()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [focusNewItem, setFocusNewItem] = useState(false)
  const itemInputRefs = useRef<Record<string, { name: HTMLInputElement | null; price: HTMLInputElement | null }>>({})

  const items = state.currentBill.items
  const people = state.currentBill.people
  const summary = getBillSummary(state.currentBill)

  // Calculate responsive column width based on number of people
  const getPersonColumnWidth = () => {
    const peopleCount = people.length
    if (peopleCount <= 4) return 'min-w-[120px]'
    if (peopleCount <= 6) return 'min-w-[100px]'
    if (peopleCount <= 8) return 'min-w-[85px]'
    return 'min-w-[75px]' // For 9+ people
  }

  const personColumnClass = getPersonColumnWidth()

  useEffect(() => {
    if (focusNewItem && items.length > 0) {
      const newItem = items[items.length - 1]
      if (newItem) {
        const newExpanded = new Set(expandedItems)
        newExpanded.add(newItem.id)
        setExpandedItems(newExpanded)

        setTimeout(() => {
          itemInputRefs.current[newItem.id]?.name?.focus()
          itemInputRefs.current[newItem.id]?.name?.select()
        }, 0)
      }
      setFocusNewItem(false)
    }
  }, [focusNewItem, items, expandedItems])

  const handleAddItem = useCallback((focus = false) => {
    const newItem: Omit<Item, "id"> = {
      name: "",
      price: "",
      quantity: 1,
      splitWith: people.map((p) => p.id),
      method: "even",
    }

    dispatch({ type: "ADD_ITEM", payload: newItem })
    setFocusNewItem(focus)
  }, [people, dispatch])

  const getItemSplits = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return {}
    return calculateItemSplits(item, people)
  }, [items, people])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, item: Item, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddItem(true)
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
      const nextIndex = e.key === "ArrowUp" ? index - 1 : index + 1
      if (nextIndex >= 0 && nextIndex < items.length) {
        const nextItem = items[nextIndex]
        if (nextItem) {
          const targetInput = e.target as HTMLInputElement
          const currentField =
            targetInput === itemInputRefs.current[item.id]?.name
              ? "name"
              : "price"
          itemInputRefs.current[nextItem.id]?.[currentField]?.focus()
          itemInputRefs.current[nextItem.id]?.[currentField]?.select()
        }
      }
    }
  }, [items, handleAddItem])

  const toggleItemExpansion = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const handleUpdateItem = useCallback((itemId: string, updates: Partial<Item>) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    const validatedUpdates = { ...updates }

    if (validatedUpdates.quantity !== undefined) {
      validatedUpdates.quantity = Math.max(1, Math.min(999, validatedUpdates.quantity || 1))
    }

    if (validatedUpdates.splitWith !== undefined) {
      const validPersonIds = people.map(p => p.id)
      validatedUpdates.splitWith = validatedUpdates.splitWith.filter(id => validPersonIds.includes(id))
    }

    dispatch({
      type: "UPDATE_ITEM",
      payload: { ...item, ...validatedUpdates },
    })
  }, [items, people, dispatch])

  const handleDeleteItem = useCallback((itemId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId })
  }, [dispatch])

  if (items.length === 0) {
    return (
      <div className="receipt-container p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="mx-auto h-16 w-16 border-2 border-border flex items-center justify-center mb-6">
            <Receipt className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-receipt-title mb-3">Start adding items</h2>
          <p className="text-receipt-label mb-6">
            Add the items from your bill. For each item, you can choose who's sharing it and how to split the cost.
          </p>
          <Button
            onClick={() => handleAddItem(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Item
          </Button>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Tip: Use keyboard shortcuts for faster input
            </p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">N</kbd>
                <span className="text-[11px] text-muted-foreground">New item</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-[10px] font-medium border border-border/50">P</kbd>
                <span className="text-[11px] text-muted-foreground">Add person</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calculate item total
  const getItemTotal = (item: Item) => {
    return parseFloat(item.price || "0") * (item.quantity || 1)
  }

  return (
    <div className="receipt-container">
      {/* Section Header */}
      <div className="receipt-section-header flex justify-between items-center">
        <span>ITEMS LEDGER</span>
        <Button
          onClick={() => handleAddItem(true)}
          size="sm"
          className="h-8 px-3 receipt-button text-xs font-bold uppercase"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto relative">
        {/* Scroll indicator for many people */}
        {people.length > 5 && (
          <div className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-20 flex items-center justify-end pr-2">
            <div className="text-xs text-muted-foreground rotate-90 whitespace-nowrap font-receipt">
              SCROLL →
            </div>
          </div>
        )}

        <table className="ledger-table">
          {/* Header */}
          <thead className="ledger-header">
            <tr>
              <th className="ledger-header-cell w-12 sticky left-0 z-10 bg-muted/50">#</th>
              <th className="ledger-header-cell min-w-[200px] sticky left-12 z-10 bg-muted/50">Item</th>
              <th className="ledger-header-cell-right w-16">Qty</th>
              <th className="ledger-header-cell-right w-28">Price</th>
              {people.map((person) => (
                <th key={person.id} className={`ledger-header-cell-right ${personColumnClass}`}>
                  <div className="flex items-center justify-end gap-1.5" title={person.name}>
                    <div
                      className="person-dot"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    {people.length <= 6 ? (
                      <span className="truncate">{person.name.toUpperCase()}</span>
                    ) : (
                      <span className="text-[10px] font-bold">{person.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="ledger-header-cell-right w-32">Total</th>
              <th className="ledger-header-cell w-10"></th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {items.map((item, index) => {
              const isExpanded = expandedItems.has(item.id)
              const splits = getItemSplits(item.id)
              const validationStatus = getItemValidationStatus(item)
              const itemTotal = getItemTotal(item)

              return (
                <React.Fragment key={item.id}>
                  {/* Main Row */}
                  <tr className={`ledger-row ${isExpanded ? 'ledger-row-expanded' : ''}`}>
                    {/* Row Number */}
                    <td className="ledger-cell ledger-row-number sticky left-0 z-10 bg-card">
                      #{String(index + 1).padStart(2, '0')}
                    </td>

                    {/* Item Name */}
                    <td className="ledger-cell min-w-[200px] sticky left-12 z-10 bg-card">
                      <div className="flex items-center gap-2">
                        <Input
                          ref={(el) => {
                            if (!itemInputRefs.current[item.id])
                              itemInputRefs.current[item.id] = { name: null, price: null }
                            itemInputRefs.current[item.id]!.name = el
                          }}
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, item, index)}
                          placeholder="Item name..."
                          className="h-8 border-none bg-transparent focus-visible:ring-1 text-sm font-medium flex-1"
                        />
                        {/* Clickable split method badge */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const nextMethod = getNextSplitMethod(item.method)
                            handleUpdateItem(item.id, { method: nextMethod })
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wide border transition-all hover:scale-105 cursor-pointer ${getSplitMethodColor(item.method)}`}
                          title={`Split method: ${item.method}. Click to cycle through methods.`}
                        >
                          {React.createElement(getSplitMethodIcon(item.method), { className: "h-3 w-3" })}
                          <span>{getSplitMethodLabel(item.method)}</span>
                        </button>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="ledger-cell-number">
                      <Input
                        type="number"
                        min="1"
                        max="999"
                        value={item.quantity || 1}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => handleKeyDown(e, item, index)}
                        className="h-8 border-none bg-transparent focus-visible:ring-1 text-center text-sm w-full"
                      />
                    </td>

                    {/* Price */}
                    <td className="ledger-cell-number">
                      <Input
                        ref={(el) => {
                          if (!itemInputRefs.current[item.id])
                            itemInputRefs.current[item.id] = { name: null, price: null }
                          itemInputRefs.current[item.id]!.price = el
                        }}
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\\.?[0-9]*"
                        value={item.price}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { price: validateCurrencyInput(e.target.value).value.toString() })
                        }
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => handleKeyDown(e, item, index)}
                        placeholder="0.00"
                        className="h-8 border-none bg-transparent focus-visible:ring-1 text-right text-sm w-full"
                      />
                    </td>

                    {/* Person Columns */}
                    {people.map((person) => {
                      const personSplit = splits[person.id] || 0
                      const isAssigned = item.splitWith.includes(person.id)
                      const percentage = itemTotal > 0 ? (personSplit / itemTotal) * 100 : 0
                      const filledBlocks = Math.round((percentage / 100) * 8) // 8 blocks for mini bar

                      return (
                        <td key={person.id} className="ledger-cell-number">
                          <div style={{ color: person.color }}>
                            {isAssigned ? (
                              <>
                                <div className="text-receipt-number">
                                  {formatCurrency(personSplit)}
                                </div>
                                {/* Mini proportion bar */}
                                {personSplit > 0 && (
                                  <div className="cell-proportion-bar">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`cell-proportion-block ${i < filledBlocks ? 'cell-proportion-block-filled' : 'cell-proportion-block-empty'}`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </td>
                      )
                    })}

                    {/* Total */}
                    <td className="ledger-cell-number font-bold">
                      {formatCurrency(itemTotal)}
                    </td>

                    {/* Actions */}
                    <td className="ledger-cell">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleItemExpansion(item.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit split settings"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <Edit2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={people.length + 6} className="border-b border-border">
                        <div className="bg-muted/20 p-5 space-y-5">
                          {/* Validation warnings */}
                          {!validationStatus.isValid && (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <div className="text-sm text-amber-900 dark:text-amber-100">
                                <p className="font-semibold mb-1.5">Please complete this item:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                  {validationStatus.warnings.map((warning, idx) => (
                                    <li key={idx}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Method and Custom Inputs */}
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Splitting Method</label>
                                <SplitMethodSelector
                                  value={item.method}
                                  onValueChange={(value) => handleUpdateItem(item.id, { method: value })}
                                />
                              </div>
                              {item.method !== "even" && (
                                <div className="pt-2 space-y-2">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom Amounts</label>
                                  <SplitMethodInput
                                    item={item}
                                    people={people}
                                    onCustomSplitsChange={(customSplits) =>
                                      handleUpdateItem(item.id, { customSplits })
                                    }
                                  />
                                </div>
                              )}
                            </div>

                            {/* Right: Split With */}
                            <div className="space-y-2">
                              <PersonSelector
                                selectedPeople={item.splitWith}
                                onSelectionChange={(selected) =>
                                  handleUpdateItem(item.id, { splitWith: selected })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}

            {/* Person Totals Row */}
            <tr className="ledger-footer">
              <td colSpan={4} className="ledger-footer-cell text-right">
                SUBTOTAL
              </td>
              {people.map((person) => {
                const personTotal = summary.personTotals.find(pt => pt.personId === person.id)
                return (
                  <td key={person.id} className="ledger-footer-cell text-right" style={{ color: person.color }}>
                    {formatCurrency(personTotal?.subtotal || 0)}
                  </td>
                )
              })}
              <td className="ledger-footer-cell text-right">
                {formatCurrency(summary.subtotal)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tax & Tip Section */}
      <div className="p-5 border-t-2 border-border">
        <TaxTipSection />
      </div>

      {/* Add Item Button at Bottom */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={() => handleAddItem(true)}
          className="w-full justify-start text-muted-foreground hover:text-foreground h-10 rounded-xl hover:bg-muted/50 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add another item
        </Button>
      </div>
    </div>
  )
}
