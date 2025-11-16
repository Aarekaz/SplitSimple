"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { ChevronDown, ChevronUp, Plus, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useBill } from "@/contexts/BillContext"
import { PersonSelector } from "./PersonSelector"
import { SplitMethodSelector } from "./SplitMethodSelector"
import { SplitMethodInput } from "./SplitMethodInput"
import { TaxTipSection } from "./TaxTipSection"
import { calculateItemSplits } from "@/lib/calculations"
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

export function MobileLedgerView() {
  const { state, dispatch } = useBill()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [focusNewItem, setFocusNewItem] = useState(false)
  const itemInputRefs = useRef<Record<string, { name: HTMLInputElement | null; price: HTMLInputElement | null }>>({})

  const items = state.currentBill.items
  const people = state.currentBill.people

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

  const getPersonAbbreviation = (person: Person, index: number) => {
    return person.name.charAt(0).toUpperCase()
  }

  if (items.length === 0) {
    return (
      <div className="receipt-container p-12">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 border-2 border-border flex items-center justify-center mb-6">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-receipt-title mb-3">No items yet</h2>
          <p className="text-receipt-label max-w-md mx-auto mb-6">
            Add your first item to start building the bill
          </p>
          <Button onClick={() => handleAddItem(true)} className="receipt-button">
            <Plus className="h-4 w-4 mr-2" />
            Add First Item
          </Button>
        </div>
      </div>
    )
  }

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

      {/* Items List */}
      <div className="divide-y-2 divide-border">
        {items.map((item, index) => {
          const isExpanded = expandedItems.has(item.id)
          const splits = getItemSplits(item.id)
          const validationStatus = getItemValidationStatus(item)
          const itemTotal = getItemTotal(item)
          const quantity = item.quantity || 1
          const displayName = quantity > 1 ? `${item.name} (×${quantity})` : item.name

          return (
            <div key={item.id} className="hover-highlight">
              <div className="p-4">
                {/* Item Header */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="ledger-row-number mt-1.5">
                    #{String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        ref={(el) => {
                          if (!itemInputRefs.current[item.id])
                            itemInputRefs.current[item.id] = { name: null, price: null }
                          itemInputRefs.current[item.id]!.name = el
                        }}
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                        placeholder="Item name..."
                        className="h-9 border-none bg-transparent focus-visible:ring-1 text-sm font-medium flex-1"
                      />
                      {item.method !== "even" && (
                        <span className="cell-split-badge">
                          {getSplitMethodLabel(item.method)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        ref={(el) => {
                          if (!itemInputRefs.current[item.id])
                            itemInputRefs.current[item.id] = { name: null, price: null }
                          itemInputRefs.current[item.id]!.price = el
                        }}
                        type="text"
                        inputMode="decimal"
                        value={item.price}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { price: validateCurrencyInput(e.target.value).value.toString() })
                        }
                        onFocus={(e) => e.target.select()}
                        placeholder="$0.00"
                        className="h-8 w-28 border-none bg-transparent focus-visible:ring-1 text-right text-sm font-semibold"
                      />
                      {quantity > 1 && (
                        <div className="text-xs text-muted-foreground">
                          × {quantity}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteItem(item.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Person Splits */}
                <div className="space-y-1.5 font-receipt text-[13px]">
                  {people.map((person) => {
                    const personSplit = splits[person.id] || 0
                    const isAssigned = item.splitWith.includes(person.id)
                    const percentage = itemTotal > 0 ? (personSplit / itemTotal) * 100 : 0
                    const filledBlocks = Math.round((percentage / 100) * 20)

                    return (
                      <div key={person.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="person-dot text-[10px]"
                            style={{ backgroundColor: person.color }}
                          >
                            {getPersonAbbreviation(person, people.indexOf(person))}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">
                            {person.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAssigned && personSplit > 0 && (
                            <div className="proportion-blocks" style={{ color: person.color }}>
                              {Array.from({ length: 8 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`proportion-block ${i < Math.round((percentage / 100) * 8) ? 'proportion-block-filled' : 'proportion-block-empty'}`}
                                />
                              ))}
                            </div>
                          )}
                          <span className="text-receipt-number text-xs min-w-[60px] text-right" style={{ color: isAssigned ? person.color : undefined }}>
                            {isAssigned ? formatCurrency(personSplit) : '—'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Validation Warnings */}
                {!validationStatus.isValid && (
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-900 dark:text-amber-100">
                      {validationStatus.warnings.join(', ')}
                    </div>
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleItemExpansion(item.id)}
                  className="w-full mt-3 h-8 text-xs"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide Settings
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Edit Split Settings
                    </>
                  )}
                </Button>

                {/* Expanded Settings */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t-2 border-border space-y-4">
                    {/* Quantity */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        max="999"
                        value={item.quantity || 1}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-center"
                      />
                    </div>

                    {/* Split Method */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Splitting Method</label>
                      <SplitMethodSelector
                        value={item.method}
                        onValueChange={(value) => handleUpdateItem(item.id, { method: value })}
                      />
                    </div>

                    {/* Person Selector */}
                    <PersonSelector
                      selectedPeople={item.splitWith}
                      onSelectionChange={(selected) =>
                        handleUpdateItem(item.id, { splitWith: selected })
                      }
                    />

                    {/* Custom Split Inputs */}
                    {item.method !== "even" && (
                      <div className="space-y-2">
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
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Item Button */}
      <div className="p-4 border-t-2 border-border">
        <Button
          variant="ghost"
          onClick={() => handleAddItem(true)}
          className="w-full justify-start text-muted-foreground hover:text-foreground h-10 rounded-xl hover:bg-muted/50 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add another item
        </Button>
      </div>

      {/* Tax & Tip Section */}
      <div className="p-4 border-t-2 border-border">
        <TaxTipSection />
      </div>
    </div>
  )
}
