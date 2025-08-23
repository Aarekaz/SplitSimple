"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2, Calculator, Users, GripVertical, Check } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useBill } from "@/contexts/BillContext"
import { PersonSelector } from "./PersonSelector"
import { EnhancedPersonSelector } from "./EnhancedPersonSelector"
import { SplitMethodSelector } from "./SplitMethodSelector"
import { SplitMethodInput } from "./SplitMethodInput"
import { TaxTipSection } from "./TaxTipSection"
import { calculateItemSplits } from "@/lib/calculations"
import type { Item } from "@/contexts/BillContext"
import { AddPersonForm } from "./AddPersonForm"

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative group">
      {/* Drag Handle - appears on hover */}
      <div 
        {...listeners} 
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-md cursor-grab hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-all z-10 bg-background/80 backdrop-blur-sm border border-border/50"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {/* Content with subtle left padding when drag handle is visible */}
      <div className="group-hover:pl-10 transition-all duration-200">
        {children}
      </div>
    </div>
  )
}

export function CollapsibleItemsTable() {
  const { state, dispatch } = useBill()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [focusNewItem, setFocusNewItem] = useState(false)
  const [showAddSuccess, setShowAddSuccess] = useState(false)
  const itemInputRefs = useRef<Record<string, { name: HTMLInputElement | null; price: HTMLInputElement | null }>>({})
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const items = state.currentBill.items
  const people = state.currentBill.people
  const { tax, tip, taxTipAllocation } = state.currentBill

  const sanitizeNumericInput = (value: string) => {
    // Allow only one decimal point, and only numbers.
    let sanitized = value.replace(/[^0-9.]/g, "")
    const parts = sanitized.split(".")
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join("")}`
    }
    return sanitized
  }

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_TAX", payload: sanitizeNumericInput(e.target.value) })
  }

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_TIP", payload: sanitizeNumericInput(e.target.value) })
  }

  const handleTaxTipAllocationChange = (value: "proportional" | "even") => {
    dispatch({ type: "SET_TAX_TIP_ALLOCATION", payload: value })
  }

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
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [people])

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const handleAddItem = (focus = false) => {
    // Auto-collapse all currently expanded items
    setExpandedItems(new Set())
    
    dispatch({
      type: "ADD_ITEM",
      payload: {
        name: "",
        price: "",
        splitWith: people.map((p) => p.id),
        method: "even" as const,
        customSplits: {},
      },
    })
    
    // Show success feedback
    setShowAddSuccess(true)
    setTimeout(() => setShowAddSuccess(false), 600)
    
    if (focus) {
      setFocusNewItem(true)
    }
  }

  const handleDuplicateItem = (itemToDuplicate: Item) => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        name: `${itemToDuplicate.name} (copy)`,
        price: itemToDuplicate.price,
        splitWith: itemToDuplicate.splitWith,
        method: itemToDuplicate.method,
        customSplits: itemToDuplicate.customSplits,
      },
    })
    setFocusNewItem(true)
  }

  const handleUpdateItem = (itemId: string, updates: any) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    dispatch({
      type: "UPDATE_ITEM",
      payload: { ...item, ...updates },
    })
  }

  const handleDeleteItem = (itemId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId })
  }

  const getItemSplits = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return {}
    return calculateItemSplits(item, people)
  }

  const getSelectedPeople = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return []
    return people.filter((person) => item.splitWith.includes(person.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      dispatch({ type: "REORDER_ITEMS", payload: { startIndex: oldIndex, endIndex: newIndex } })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, item: Item, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddItem(true)
    } else if ((e.metaKey || e.ctrlKey) && e.key === "d") {
      e.preventDefault()
      handleDuplicateItem(item)
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
      const nextIndex = e.key === "ArrowUp" ? index - 1 : index + 1
      if (nextIndex >= 0 && nextIndex < items.length) {
        const nextItem = items[nextIndex]
        const targetInput = e.target as HTMLInputElement
        const currentField =
          targetInput === itemInputRefs.current[item.id]?.name
            ? "name"
            : "price"
        itemInputRefs.current[nextItem.id]?.[currentField]?.focus()
        itemInputRefs.current[nextItem.id]?.[currentField]?.select()
      }
    } else if (e.key === "Escape") {
      ;(e.target as HTMLInputElement).blur()
    }
  }

  if (items.length === 0) {
    return (
      <Card className="text-center">
        <CardContent className="pt-8 pb-8">
          <Calculator className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No items added yet</CardTitle>
          <p className="text-muted-foreground mb-4">Add items to start splitting expenses</p>
          <Button onClick={() => handleAddItem(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Item
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="h-6 w-6 p-0">
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <CardTitle className="text-base">Items ({items.length})</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => handleAddItem(true)} 
              size="sm"
              className={`transition-all ${showAddSuccess ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {showAddSuccess ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              {showAddSuccess ? 'Added!' : 'Add Item'}
            </Button>
            <div className="text-xs text-muted-foreground hidden sm:block">
              <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">⌘</kbd>
              <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs ml-0.5">↵</kbd>
            </div>
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
            <div className="space-y-3 p-4">
                    {items.map((item, index) => {
                const isExpanded = expandedItems.has(item.id)
                const splits = getItemSplits(item.id)
                const selectedPeople = getSelectedPeople(item.id)

                return (
                        <SortableItem key={item.id} id={item.id}>
                          <div className="rounded-lg border bg-card hover:shadow-sm transition-all group">
                            {/* Modern Row */}
                            <div className="flex items-center p-3 gap-4">
                              {/* Chevron */}
                                                            <div className="cursor-pointer hover:bg-muted/50 rounded-md p-1 transition-colors" onClick={() => toggleItemExpansion(item.id)}>
                                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>

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
                                    className="h-9 border-none bg-transparent focus-visible:ring-1 text-sm font-medium"
                                  />
                                  {/* Split info as subtle badge */}
                                  {selectedPeople.length > 0 && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground border-none">
                                      {item.method === "even" ? 
                                        `${selectedPeople.length} way${selectedPeople.length > 1 ? 's' : ''}` :
                                        `${item.method === 'shares' ? 'Shares' : item.method === 'percent' ? '%' : '$'} · ${selectedPeople.length}`
                                      }
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
                                            handleUpdateItem(item.id, { price: sanitizeNumericInput(e.target.value) })
                                          }
                                          onFocus={(e) => e.target.select()}
                                          onKeyDown={(e) => handleKeyDown(e, item, index)}
                                          placeholder="0.00"
                                  className="font-mono h-9 border-none bg-transparent focus-visible:ring-1 text-right font-semibold"
                                        />
                                      </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-1">
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

                            {/* Expanded Row */}
                            {isExpanded && (
                              <div className="border-t bg-muted/20 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="p-4 space-y-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Split Method */}
                                    <SplitMethodSelector
                                      value={item.method}
                                      onValueChange={(value) => handleUpdateItem(item.id, { method: value })}
                                    />

                                      {/* Split With */}
                                    <EnhancedPersonSelector
                                          selectedPeople={item.splitWith}
                                          onSelectionChange={(selected) => handleUpdateItem(item.id, { splitWith: selected })}
                                        />
                                  </div>

                                  {/* Custom Split Inputs */}
                                  {item.method !== "even" && (
                                    <div className="pt-2 border-t">
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
              <div className="bg-background">
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddItem(true)}
                    className="w-full justify-start text-muted-foreground hover:text-foreground h-9"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add item
                  </Button>
                </div>
              </div>

              </div>

            {/* Tax and Tip Section for Desktop */}
            <div className="p-4">
              <TaxTipSection />
            </div>
          </div>

                    {/* Mobile View */}
          <div className="lg:hidden p-4 space-y-3">
            {items.map((item, index) => {
              const isExpanded = expandedItems.has(item.id)
              const splits = getItemSplits(item.id)
              const selectedPeople = getSelectedPeople(item.id)

              return (
                <div key={item.id} className="rounded-lg border bg-card hover:shadow-sm transition-all group">
                  {/* Mobile Row */}
                  <div className="p-3 space-y-3">
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
                            className="h-9 border-none bg-transparent focus-visible:ring-1 text-sm font-medium flex-1"
                          />
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
                                handleUpdateItem(item.id, { price: sanitizeNumericInput(e.target.value) })
                              }
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => handleKeyDown(e, item, index)}
                              placeholder="0.00"
                          className="font-mono h-9 border-none bg-transparent focus-visible:ring-1 text-right font-semibold"
                            />
                          </div>
                      
                      {/* Split info and expand button */}
                      <div className="flex items-center gap-3">
                        {selectedPeople.length > 0 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground border-none">
                            {item.method === "even" ? 
                              `${selectedPeople.length} way${selectedPeople.length > 1 ? 's' : ''}` :
                              `${item.method === 'shares' ? 'Shares' : item.method === 'percent' ? '%' : '$'} · ${selectedPeople.length}`
                            }
                          </Badge>
                        )}
                        <button
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => toggleItemExpansion(item.id)}
                        >
                          <span>Details</span>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                        </div>
                          </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">
                      <div className="space-y-6">
                        {/* Split Method */}
                        <SplitMethodSelector
                          value={item.method}
                          onValueChange={(value) => handleUpdateItem(item.id, { method: value })}
                        />

                          {/* Split With */}
                        <EnhancedPersonSelector
                              selectedPeople={item.splitWith}
                              onSelectionChange={(selected) => handleUpdateItem(item.id, { splitWith: selected })}
                            />
                      </div>

                      {/* Custom Split Inputs */}
                      {item.method !== "even" && (
                        <div className="pt-2 border-t">
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
              )
            })}

            {/* Tax and Tip Section */}
            <TaxTipSection />
          </div>
        </CardContent>
      )}

    </Card>
  )
}
