"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { ChevronDown, ChevronUp, ChevronRight, Plus, Trash2, Calculator, Users, GripVertical, Check, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { MobileDragDrop, MobileSortableItem } from "./MobileDragDrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useBill } from "@/contexts/BillContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { PersonSelector } from "./PersonSelector"
import { SplitMethodSelector } from "./SplitMethodSelector"
import { SplitMethodInput } from "./SplitMethodInput"
import { TaxTipSection } from "./TaxTipSection"
import { calculateItemSplits } from "@/lib/calculations"
import { validateCurrencyInput } from "@/lib/validation"
import type { Item, Person } from "@/contexts/BillContext"
import { AddPersonForm } from "./AddPersonForm"
import { EmptyItemsState } from "./EmptyStates"

function AvatarStack({ people }: { people: Person[] }) {
  const maxAvatars = 4
  const visibleAvatars = people.slice(0, maxAvatars)
  const hiddenCount = people.length - maxAvatars

  return (
    <div className="flex items-center -space-x-2">
      {visibleAvatars.map((person) => (
        <div
          key={person.id}
          className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: person.color }}
          title={person.name}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {hiddenCount > 0 && (
        <div className="w-6 h-6 rounded-full border-2 border-background bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
          +{hiddenCount}
        </div>
      )}
    </div>
  )
}

function getSplitMethodLabel(method: "even" | "shares" | "percent" | "exact"): string {
  const labels = {
    even: "Even",
    shares: "Shares",
    percent: "Percent",
    exact: "Exact"
  }
  return labels[method]
}

function getItemValidationStatus(item: Item): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []
  
  // Check if item has a name
  if (!item.name || item.name.trim() === "") {
    warnings.push("Item name is missing")
  }
  
  // Check if item has a price
  if (!item.price || parseFloat(item.price) <= 0) {
    warnings.push("Price is required")
  }
  
  // Check if item has people assigned
  if (item.splitWith.length === 0) {
    warnings.push("No one assigned to this item")
  }
  
  // Check custom splits for percent and exact methods
  if (item.method === "percent" && item.customSplits) {
    const totalPercent = Object.values(item.customSplits).reduce((sum, val) => sum + val, 0)
    if (Math.abs(totalPercent - 100) > 0.01) {
      warnings.push("Percentages must add up to 100%")
    }
  }
  
  if (item.method === "exact" && item.customSplits) {
    const totalExact = Object.values(item.customSplits).reduce((sum, val) => sum + val, 0)
    const itemTotal = parseFloat(item.price) * (item.quantity || 1)
    if (Math.abs(totalExact - itemTotal) > 0.01) {
      warnings.push("Exact amounts must equal item total")
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  }
}

function SortableItem({ id, children, isSelected, onSelect }: { id: string; children: React.ReactNode; isSelected?: boolean; onSelect?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div
        className={`grid grid-cols-[36px_1fr] items-stretch rounded-xl ${isSelected ? 'ring-2 ring-primary/40' : 'ring-1 ring-transparent'}`}
        onClick={onSelect}
      >
        {/* Drag Handle - left gutter, handle-only drag */}
        <button
          {...listeners}
          {...attributes}
          aria-label="Drag handle for item reordering. Press Enter to focus item controls."
          title="Drag to reorder or press Enter to focus item"
          className="m-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/40 bg-background/70 backdrop-blur-sm cursor-grab focus:outline-none focus:ring-2 focus:ring-primary/40 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              const itemContent = (e.currentTarget.parentElement?.querySelector('[data-item-input="name"]') as HTMLInputElement) || null
              itemContent?.focus()
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const allDragHandles = document.querySelectorAll('[aria-label*="Drag handle"]')
              const currentIndex = Array.from(allDragHandles).indexOf(e.currentTarget as Element)
              let nextIndex: number
              if (e.key === 'ArrowUp') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : allDragHandles.length - 1
              } else {
                nextIndex = currentIndex < allDragHandles.length - 1 ? currentIndex + 1 : 0
              }
              (allDragHandles[nextIndex] as HTMLElement)?.focus()
            }
          }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}

export function CollapsibleItemsTable() {
  const { state, dispatch } = useBill()
  const isMobile = useIsMobile()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [focusNewItem, setFocusNewItem] = useState(false)
  const [showAddSuccess, setShowAddSuccess] = useState(false)
  const itemInputRefs = useRef<Record<string, { name: HTMLInputElement | null; price: HTMLInputElement | null }>>({})
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
    
    if (focus) {
      setShowAddSuccess(true)
      setTimeout(() => setShowAddSuccess(false), 2000)
    }
  }, [people, dispatch])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }
      
      // Cmd+Enter / Ctrl+Enter to add new item
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleAddItem(true)
      }

      // Delete to remove selected item
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedItemId) {
          e.preventDefault()
          handleDeleteItem(selectedItemId)
        }
      }

      // Cmd/Ctrl + D to duplicate selected item (if exists)
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'd')) {
        if (selectedItemId) {
          e.preventDefault()
          const item = items.find(i => i.id === selectedItemId)
          if (item) {
            const duplicate = { ...item, id: undefined as unknown as string }
            dispatch({ type: "ADD_ITEM", payload: {
              name: duplicate.name,
              price: duplicate.price,
              quantity: duplicate.quantity,
              splitWith: duplicate.splitWith,
              method: duplicate.method,
              customSplits: duplicate.customSplits,
            } })
            setFocusNewItem(true)
          }
        }
      }

      // Arrow Up/Down to change selected cell
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (items.length === 0) return
        const currentIndex = selectedItemId ? items.findIndex(i => i.id === selectedItemId) : -1
        let nextIndex = currentIndex
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1
        } else {
          nextIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1
        }
        const nextItem = items[nextIndex]
        if (nextItem) {
          setSelectedItemId(nextItem.id)
        }
      }

      // Enter focuses the first input of the selected item
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (selectedItemId) {
          e.preventDefault()
          const ref = itemInputRefs.current[selectedItemId]?.name
          if (ref) {
            ref.focus()
            ref.select()
          }
        }
      }

      // Escape to collapse expanded items
      if (e.key === 'Escape') {
        const expandedItemsArray = Array.from(expandedItems)
        if (expandedItemsArray.length > 0) {
          e.preventDefault()
          setExpandedItems(new Set())
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [people, handleAddItem, selectedItemId, items, dispatch, expandedItems])

  const getItemSplits = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return {}
    return calculateItemSplits(item, people)
  }, [items, people])

  const getSelectedPeople = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return []
    return people.filter((person) => item.splitWith.includes(person.id))
  }, [items, people])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    try {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        console.warn('Invalid drag operation: item not found')
        return
      }

      dispatch({ type: "REORDER_ITEMS", payload: { startIndex: oldIndex, endIndex: newIndex } })
    } catch (error) {
      console.error('Error during drag operation:', error)
    }
  }, [items, dispatch])

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
          // Only select text on explicit user action, not tab navigation
          if (e.shiftKey) {
          itemInputRefs.current[nextItem.id]?.[currentField]?.select()
          }
        }
      }
    } else if (e.key === "Escape") {
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === "Tab") {
      // Handle tab navigation within item row
      const targetInput = e.target as HTMLInputElement
      const currentField = targetInput === itemInputRefs.current[item.id]?.name ? "name" : "price"
      
      if (e.shiftKey) {
        // Shift+Tab - go to previous field
        if (currentField === "price") {
          itemInputRefs.current[item.id]?.name?.focus()
        } else if (index > 0) {
          // Go to previous item's price field
          const prevItem = items[index - 1]
          if (prevItem) {
            itemInputRefs.current[prevItem.id]?.price?.focus()
          }
        }
      } else {
        // Tab - go to next field
        if (currentField === "name") {
          itemInputRefs.current[item.id]?.price?.focus()
        } else if (index < items.length - 1) {
          // Go to next item's name field
          const nextItem = items[index + 1]
          if (nextItem) {
            itemInputRefs.current[nextItem.id]?.name?.focus()
          }
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
    if (!item) {
      console.warn(`Attempted to update non-existent item with ID: ${itemId}`)
      return
    }

    // Validate updates to prevent invalid data
    const validatedUpdates = { ...updates }

    // Ensure quantity is always positive
    if (validatedUpdates.quantity !== undefined) {
      validatedUpdates.quantity = Math.max(1, Math.min(999, validatedUpdates.quantity || 1))
    }

    // Ensure splitWith only contains valid person IDs
    if (validatedUpdates.splitWith !== undefined) {
      const validPersonIds = people.map(p => p.id)
      validatedUpdates.splitWith = validatedUpdates.splitWith.filter(id => validPersonIds.includes(id))
    }

    try {
      dispatch({
        type: "UPDATE_ITEM",
        payload: { ...item, ...validatedUpdates },
      })
    } catch (error) {
      console.error(`Failed to update item ${itemId}:`, error)
    }
  }, [items, people, dispatch])

  const handleDeleteItem = useCallback((itemId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId })
  }, [dispatch])



  if (items.length === 0) {
    return (
      <Card className="float-card border-0">
        <CardContent className="p-0">
          <EmptyItemsState 
            onAddItem={() => handleAddItem(true)}
            hasPeople={state.currentBill.people.length > 0}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="float-card-lg border-0 overflow-visible">
      {/* Header */}
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="h-8 w-8 p-0 rounded-xl hover:bg-muted/50"
            >
              <div 
                className="transition-transform duration-300" 
                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </Button>
            <CardTitle className="text-title">Items ({items.length})</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs hidden sm:flex items-center gap-1">
              <kbd className="px-2 py-1 bg-surface-2 text-foreground rounded-md text-xs font-semibold border border-border shadow-sm">⌘</kbd>
              <kbd className="px-2 py-1 bg-surface-2 text-foreground rounded-md text-xs font-semibold border border-border shadow-sm">↵</kbd>
                <span className="text-xs text-foreground/70 ml-1 font-medium">Add item</span>
              </div>
              <div className="text-xs hidden sm:flex items-center gap-1 ml-2">
                <kbd className="px-2 py-1 bg-surface-2 text-foreground rounded-md text-xs font-semibold border border-border shadow-sm">⌘</kbd>
                <kbd className="px-2 py-1 bg-surface-2 text-foreground rounded-md text-xs font-semibold border border-border shadow-sm">D</kbd>
                <span className="text-xs text-foreground/70 ml-1 font-medium">Duplicate</span>
              </div>
              <div className="text-xs hidden sm:flex items-center gap-1 ml-2">
                <kbd className="px-2 py-1 bg-surface-2 text-foreground rounded-md text-xs font-semibold border border-border shadow-sm">Esc</kbd>
                <span className="text-xs text-foreground/70 ml-1 font-medium">Collapse</span>
            </div>
            <Button
              onClick={() => handleAddItem(true)}
              size="sm"
              className={`btn-float rounded-xl transition-all duration-300 hover:animate-bounce-subtle ${showAddSuccess ? 'bg-success hover:bg-success/90 text-white success-pulse' : 'bg-primary hover:bg-primary/90 text-primary-foreground'} font-semibold h-9 px-4 shadow-md`}
            >
              <div className="transition-transform duration-200 flex items-center">
                {showAddSuccess ? (
                  <Check className="h-4 w-4 mr-1.5" />
                ) : (
                  <Plus className="h-4 w-4 mr-1.5" />
                )}
                {showAddSuccess ? 'Added!' : 'Add Item'}
              </div>
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0 lg:p-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block">
          <div className="overflow-x-auto">
            {/* Table Body */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 px-5 pb-5">
                    {items.map((item, index) => {
                const isExpanded = expandedItems.has(item.id)
                const splits = getItemSplits(item.id)
                const selectedPeople = getSelectedPeople(item.id)
                const validationStatus = getItemValidationStatus(item)

                return (
                        <SortableItem key={item.id} id={item.id} isSelected={selectedItemId === item.id} onSelect={() => setSelectedItemId(item.id)}>
                          <div 
                            className={`float-card-sm border transition-all duration-300 group hover:shadow-md hover:border-border-strong ${isExpanded ? 'ring-2 ring-primary/20 shadow-lg' : ''}`}
                            role="listitem"
                            aria-label={`Item ${index + 1}: ${item.name || 'Unnamed item'}, $${item.price || '0.00'}`}
                          >
                            {/* Modern Row */}
                            <div className="flex items-center p-4 gap-4">
                              {/* Chevron */}
                                                            <button
                                type="button"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? "Collapse item details" : "Expand item details"}
                                className="rounded-md p-2 transition-all duration-200 hover:bg-muted/60 active:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 min-w-[44px] min-h-[44px] flex items-center justify-center rainbow-border-hover"
                                onMouseDown={(e) => { e.preventDefault() }}
                                onClick={(e) => { e.stopPropagation(); toggleItemExpansion(item.id) }}
                                title={isExpanded ? "Click to collapse details" : "Click to expand details"}
                              >
                                <ChevronRight className={`h-4 w-4 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>

                                      {/* Item Name */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                        <Input
                                          ref={(el) => {
                                            if (!itemInputRefs.current[item.id])
                                              itemInputRefs.current[item.id] = { name: null, price: null }
                                            itemInputRefs.current[item.id]!.name = el
                                          }}
                                          value={item.name}
                                          onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                          onKeyDown={(e) => handleKeyDown(e, item, index)}
                                          placeholder="Add your item..."
                                          data-item-input="name"
                                          className="receipt-item-name h-9 text-sm focus:focus-input transition-all duration-200"
                                          inputMode="text"
                                          enterKeyHint="next"
                                  />
                                  {/* Split method badge */}
                                  {!isExpanded && item.method !== "even" && (
                                    <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/30 bg-primary/5 text-primary">
                                      {getSplitMethodLabel(item.method)}
                                    </Badge>
                                  )}
                                  {/* Split info as subtle badge */}
                        {selectedPeople.length > 0 ? (
                                    <AvatarStack people={selectedPeople} />
                        ) : (
                                    <Badge variant="secondary" className="receipt-detail px-2 py-0.5 bg-muted/50 border-none">
                            No one
                          </Badge>
                        )}
                      </div>
                                      </div>
                              
                                      {/* Price */}
                              <div className="w-32">
                                        <Input
                                          ref={(el) => {
                                            if (!itemInputRefs.current[item.id])
                                              itemInputRefs.current[item.id] = { name: null, price: null }
                                            itemInputRefs.current[item.id]!.price = el
                                          }}
                                          type="text"
                                          inputMode="decimal"
                                          pattern="[0-9]*\\.?[0-9]*"
                                          step="0.01"
                                          min="0"
                                          value={item.price}
                                          onChange={(e) =>
                                            handleUpdateItem(item.id, { price: validateCurrencyInput(e.target.value).value.toString() })
                                          }
                                          onFocus={(e) => e.target.select()}
                                          onKeyDown={(e) => handleKeyDown(e, item, index)}
                                          placeholder="0.00"
                                          className="receipt-amount h-9 focus:focus-input transition-all duration-200"
                                          enterKeyHint={index === items.length - 1 ? "done" : "next"}
                                        />
                                      </div>
                              
                              {/* Quantity */}
                              {(item.quantity > 1 || isExpanded) && (
                                <div className="w-20">
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
                                    className="h-9 text-center text-sm focus:focus-input transition-all duration-200"
                                    title="Quantity"
                                    inputMode="numeric"
                                    enterKeyHint="next"
                                  />
                                </div>
                              )}
                              
                              {/* Validation Status */}
                              {!isExpanded && (
                                <div className="flex items-center" title={validationStatus.isValid ? "Item is complete" : validationStatus.warnings.join(', ')}>
                                  {validationStatus.isValid ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <AlertCircle 
                                      className="h-4 w-4 text-amber-600 dark:text-amber-400" 
                                    />
                                  )}
                                </div>
                              )}
                              
                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteItem(item.id)} 
                                  className="h-11 w-11 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity rainbow-border-hover"
                                  title="Delete item"
                                  aria-label={`Delete ${item.name || 'item'}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                                      </div>

                            {/* Expanded Row */}
                            {isExpanded && (
                              <div 
                                className="border-t bg-muted/20 animate-in slide-in-from-top-2 fade-in duration-200 animate-expand-glow"
                                role="region"
                                aria-label={`Details for ${item.name || 'item'}`}
                                aria-live="polite"
                              >
                                <div className="p-5 space-y-5">
                                  {/* Validation warnings */}
                                  {!validationStatus.isValid && (
                                    <div 
                                      className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                                      role="alert"
                                      aria-live="assertive"
                                    >
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
                                  
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                    {/* Left Side: Method and Custom Inputs */}
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

                                    {/* Right Side: Split With */}
                                    <div className="space-y-2">
                                      <PersonSelector
                                        selectedPeople={item.splitWith}
                                        onSelectionChange={(selected) =>
                                          handleUpdateItem(item.id, { splitWith: selected })
                                        }
                                        showQuickAdd={true}
                                        onPersonAdded={(personId) => {
                                          // Auto-select the newly added person for this item
                                          handleUpdateItem(item.id, { splitWith: [...item.splitWith, personId] })
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </SortableItem>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add Item Row */}
              <div className="px-5 pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddItem(true)}
                    className="w-full justify-start text-muted-foreground hover:text-foreground h-10 rounded-xl hover:bg-muted/50 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add item
                  </Button>
              </div>

              </div>

            {/* Tax and Tip Section for Desktop */}
            <div className="px-5 pb-5">
              <TaxTipSection />
                        </div>
                      </div>

                    {/* Mobile View */}
          <div className="lg:hidden px-5 pb-5 space-y-3">
            <MobileDragDrop items={items.map((i) => i.id)} onDragEnd={handleDragEnd}>
            {items.map((item, index) => {
              const isExpanded = expandedItems.has(item.id)
              const splits = getItemSplits(item.id)
              const selectedPeople = getSelectedPeople(item.id)
              const validationStatus = getItemValidationStatus(item)

              return (
              <MobileSortableItem key={item.id} id={item.id}>
                <div className={`float-card-sm border transition-all duration-300 group hover:shadow-md hover:border-border-strong ${selectedItemId === item.id ? 'ring-2 ring-primary/40' : ''} ${isExpanded ? 'ring-2 ring-primary/20 shadow-lg' : ''}`} onClick={() => setSelectedItemId(item.id)}>
                  {/* Mobile Row */}
                  <div className="p-3 space-y-3">
                    {/* Expandable hint */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-muted-foreground">
                        {isExpanded ? "Split settings visible" : "Tap 'Details' for split settings"}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isExpanded && (
                          <div title={validationStatus.isValid ? "Complete" : validationStatus.warnings.join(', ')}>
                            {validationStatus.isValid ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                        )}
                        <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          isExpanded ? 'bg-primary scale-125' : 'bg-muted hover:bg-muted-foreground'
                        }`} />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      {/* Item Name */}
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
                              onKeyDown={(e) => handleKeyDown(e, item, index)}
                              placeholder="Add your item..."
                              className="receipt-item-name h-9 text-sm flex-1 focus:focus-input transition-all duration-200"
                              inputMode="text"
                              enterKeyHint="next"
                          />
                          {/* Split method badge for mobile */}
                          {!isExpanded && item.method !== "even" && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/30 bg-primary/5 text-primary shrink-0">
                              {getSplitMethodLabel(item.method)}
                            </Badge>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteItem(item.id)
                          }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          {/* Price */}
                        <div className="w-28">
                                  <Input
                                ref={(el) => {
                                  if (!itemInputRefs.current[item.id])
                                    itemInputRefs.current[item.id] = { name: null, price: null }
                                  itemInputRefs.current[item.id]!.price = el
                                }}
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*\\.?[0-9]*"
                                    step="0.01"
                                    min="0"
                                    value={item.price}
                                    onChange={(e) =>
                                  handleUpdateItem(item.id, { price: validateCurrencyInput(e.target.value).value.toString() })
                                    }
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => handleKeyDown(e, item, index)}
                                    placeholder="0.00"
                            className="font-mono h-9 text-right font-semibold focus:focus-input transition-all duration-200"
                                enterKeyHint={index === items.length - 1 ? "done" : "next"}
                              />
                        </div>
                        
                        {/* Quantity */}
                        {(item.quantity > 1 || isExpanded) && (
                          <div className="w-16">
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
                              className="h-9 text-center text-sm"
                              title="Quantity"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Split info and expand button */}
                      <div className="flex items-center gap-2">
                        {selectedPeople.length > 0 ? (
                           <AvatarStack people={selectedPeople} />
                        ) : (
                           <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground border-none">
                            No one
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleItemExpansion(item.id)}
                          className="h-10 px-4 text-xs shrink-0 min-w-[44px] transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 focus:ring-2 focus:ring-primary/40 rainbow-border-hover"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Collapse item details" : "Expand item details"}
                          title={isExpanded ? "Click to collapse details" : "Click to expand details"}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1 transition-transform duration-200" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1 transition-transform duration-200" />
                              Details
                            </>
                          )}
                        </Button>
                      </div>
                        </div>
                          </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-5 animate-in slide-in-from-top-2 fade-in duration-200 animate-expand-glow">
                      {/* Validation warnings */}
                      {!validationStatus.isValid && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div className="text-sm text-amber-900 dark:text-amber-100">
                            <p className="font-semibold mb-1.5">Please complete:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                              {validationStatus.warnings.map((warning, idx) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-5">
                        {/* Split Method */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Splitting Method</label>
                          <SplitMethodSelector
                            value={item.method}
                            onValueChange={(value) => handleUpdateItem(item.id, { method: value })}
                          />
                        </div>

                        {/* Split With */}
                        <PersonSelector
                          selectedPeople={item.splitWith}
                          onSelectionChange={(selected) => handleUpdateItem(item.id, { splitWith: selected })}
                          showQuickAdd={true}
                          onPersonAdded={(personId) => {
                            // Auto-select the newly added person for this item
                            handleUpdateItem(item.id, { splitWith: [...item.splitWith, personId] })
                          }}
                        />
                      </div>

                      {/* Custom Split Inputs */}
                      {item.method !== "even" && (
                        <div className="pt-2 border-t space-y-2">
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
              </MobileSortableItem>
                )
              })}
            </MobileDragDrop>

          {/* Tax and Tip Section for Mobile */}
          <div className="mt-4">
            <TaxTipSection />
          </div>
          </div>
        </CardContent>
      )}

    </Card>
  )
}
