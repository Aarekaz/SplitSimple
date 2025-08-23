"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2, Calculator, Users, GripVertical } from "lucide-react"
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
import { SplitMethodInput } from "./SplitMethodInput"
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
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center">
        <div {...listeners} className="p-3 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  )
}

export function CollapsibleItemsTable() {
  const { state, dispatch } = useBill()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [focusNewItem, setFocusNewItem] = useState(false)
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
      <div className="space-y-6">
        {people.length === 0 && (
          <Card>
            <CardHeader className="text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <CardTitle>Who's splitting the bill?</CardTitle>
              <p className="text-muted-foreground text-sm pt-1">Add the first person to get started.</p>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs mx-auto">
                <AddPersonForm showButton={false} showAlignmentDiv={false} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={`text-center ${people.length === 0 ? "border-dashed" : ""}`}>
          <CardContent className="pt-8 pb-8">
            <Calculator
              className={`mx-auto h-12 w-12 text-muted-foreground ${people.length === 0 ? "opacity-50" : ""} mb-4`}
            />
            <CardTitle className={`mb-2 ${people.length === 0 ? "text-muted-foreground" : ""}`}>
              {people.length === 0 ? "Next, add your items" : "No items added yet"}
            </CardTitle>
            <p className="text-muted-foreground mb-4">
              {people.length === 0
                ? "Once you've added people, you can add expenses."
                : "Add items to start splitting expenses"}
            </p>
            <Button onClick={() => handleAddItem(true)} disabled={people.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>
      </div>
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
          <Button onClick={() => handleAddItem(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0 lg:p-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              {/* Table Header */}
              <div className="grid grid-cols-[36px_minmax(0,1fr)_100px_200px_150px_60px] gap-px bg-border text-sm font-medium text-muted-foreground">
                <div className="bg-muted/50 p-3"></div>
                <div className="bg-muted/50 p-3">Item Name</div>
                <div className="bg-muted/50 p-3">Price</div>
                <div className="bg-muted/50 p-3">Split With</div>
                <div className="bg-muted/50 p-3">Per Person</div>
                <div className="bg-muted/50 p-3"></div>
              </div>

              {/* Table Body */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-border">
                    {items.map((item, index) => {
                      const isExpanded = expandedItems.has(item.id)
                      const splits = getItemSplits(item.id)
                      const selectedPeople = getSelectedPeople(item.id)

                      return (
                        <SortableItem key={item.id} id={item.id}>
                          <div className="bg-background">
                            {/* Collapsed Row */}
                            <div
                              className="grid grid-cols-[minmax(0,1fr)_100px_200px_150px_60px] gap-px"
                              // onClick={() => toggleItemExpansion(item.id)} // This needs to be handled differently
                            >
                              <div className="p-3 flex items-center gap-2 cursor-pointer" onClick={() => toggleItemExpansion(item.id)}>
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span className="font-medium truncate">{item.name || "Unnamed Item"}</span>
                              </div>
                              <div className="p-3 font-mono cursor-pointer" onClick={() => toggleItemExpansion(item.id)}>${(parseFloat(item.price) || 0).toFixed(2)}</div>
                              <div className="p-3 cursor-pointer" onClick={() => toggleItemExpansion(item.id)}>
                                {selectedPeople.length > 0 ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {selectedPeople.length} {selectedPeople.length === 1 ? "person" : "people"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    No one
                                  </Badge>
                                )}
                              </div>
                              <div className="p-3 cursor-pointer" onClick={() => toggleItemExpansion(item.id)}>
                                <div className="flex flex-wrap gap-1 text-sm">
                                  {Object.entries(splits)
                                    .slice(0, 2)
                                    .map(([personId, amount]) => {
                                      const person = people.find((p) => p.id === personId)
                                      return person ? (
                                        <Badge key={personId} variant="outline" className="text-xs font-mono">
                                          ${(amount as number).toFixed(2)}
                                        </Badge>
                                      ) : null
                                    })}
                                  {Object.keys(splits).length > 2 && <span className="text-muted-foreground">...</span>}
                                </div>
                              </div>
                              <div className="p-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteItem(item.id)
                                  }}
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Expanded Row */}
                            {isExpanded && (
                              <div className="col-span-full">
                                <Card className="m-4 border-t-0 rounded-t-none">
                                  <CardContent className="pt-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Item Details */}
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-sm font-medium text-card-foreground mb-1 block">Item Name</label>
                                          <Input
                                            ref={(el) => {
                                              if (!itemInputRefs.current[item.id])
                                                itemInputRefs.current[item.id] = { name: null, price: null }
                                              itemInputRefs.current[item.id]!.name = el
                                            }}
                                            value={item.name}
                                            onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                            onKeyDown={(e) => handleKeyDown(e, item, index)}
                                            placeholder="Enter item name"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-card-foreground mb-1 block">Price</label>
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
                                            className="font-mono"
                                          />
                                        </div>
                                      </div>

                                      {/* Split Configuration */}
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-sm font-medium text-card-foreground mb-1 block">
                                            Split Method
                                          </label>
                                          <Select
                                            value={item.method}
                                            onValueChange={(value: any) => handleUpdateItem(item.id, { method: value })}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="even">Even Split</SelectItem>
                                              <SelectItem value="shares">By Shares</SelectItem>
                                              <SelectItem value="percent">By Percent</SelectItem>
                                              <SelectItem value="exact">Exact Amount</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-card-foreground mb-1 block">
                                            Split With
                                          </label>
                                          <PersonSelector
                                            selectedPeople={item.splitWith}
                                            onSelectionChange={(selected) => handleUpdateItem(item.id, { splitWith: selected })}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Custom Split Inputs */}
                                    {item.method !== "even" && (
                                      <>
                                        <Separator />
                                        <SplitMethodInput
                                          item={item}
                                          people={people}
                                          onCustomSplitsChange={(customSplits) =>
                                            handleUpdateItem(item.id, { customSplits })
                                          }
                                        />
                                      </>
                                    )}

                                    {/* Per Person Breakdown */}
                                    <Separator />
                                    <div>
                                      <label className="text-sm font-medium text-card-foreground mb-2 block">
                                        Per Person Breakdown
                                      </label>
                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {Object.entries(splits).map(([personId, amount]) => {
                                          const person = people.find((p) => p.id === personId)
                                          return person ? (
                                            <Badge key={personId} variant="secondary" className="justify-between p-2 h-auto">
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: person.color }} />
                                                <span className="text-sm">{person.name}</span>
                                              </div>
                                              <span className="font-mono text-sm font-medium">
                                                ${(amount as number).toFixed(2)}
                                              </span>
                                            </Badge>
                                          ) : null
                                        })}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
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

              {/* Tax & Tip Rows */}
              <div className="bg-muted/30 col-span-5">
                <Separator />
              </div>
              {/* Tax Row */}
              <div className="grid grid-cols-subgrid col-span-5 bg-muted/30">
                <div className="p-3 font-medium text-muted-foreground col-span-1">Tax</div>
                <div className="p-3 col-span-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    step="0.01"
                    min="0"
                    value={tax}
                    onChange={handleTaxChange}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="h-8 font-mono bg-transparent border-input"
                  />
                </div>
                <div className="p-3 col-span-3 text-sm text-muted-foreground flex items-center">
                  Split {taxTipAllocation}ly
                </div>
              </div>

              {/* Tip Row */}
              <div className="grid grid-cols-subgrid col-span-5 bg-muted/30">
                <div className="p-3 font-medium text-muted-foreground col-span-1">Tip</div>
                <div className="p-3 col-span-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    step="0.01"
                    min="0"
                    value={tip}
                    onChange={handleTipChange}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="h-8 font-mono bg-transparent border-input"
                  />
                </div>
                <div className="p-3 col-span-3 text-sm text-muted-foreground flex items-center">
                  Split {taxTipAllocation}ly
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden p-4 space-y-4">
            {items.map((item, index) => {
              const isExpanded = expandedItems.has(item.id)
              const splits = getItemSplits(item.id)
              const selectedPeople = getSelectedPeople(item.id)

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader
                    className="p-4 flex flex-row items-center justify-between cursor-pointer"
                    onClick={() => toggleItemExpansion(item.id)}
                  >
                    <div className="space-y-1">
                      <CardTitle className="text-base">{item.name || "Unnamed Item"}</CardTitle>
                      <p className="text-sm font-mono text-muted-foreground">${(parseFloat(item.price) || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteItem(item.id)
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="p-4 pt-0 space-y-4">
                      {/* The same expanded content as desktop */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Item Details */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-card-foreground mb-1 block">Item Name</label>
                            <Input
                              ref={(el) => {
                                if (!itemInputRefs.current[item.id])
                                  itemInputRefs.current[item.id] = { name: null, price: null }
                                itemInputRefs.current[item.id]!.name = el
                              }}
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                              onKeyDown={(e) => handleKeyDown(e, item, index)}
                              placeholder="Enter item name"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-card-foreground mb-1 block">Price</label>
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
                              className="font-mono"
                            />
                          </div>
                        </div>

                        {/* Split Configuration */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-card-foreground mb-1 block">Split Method</label>
                            <Select
                              value={item.method}
                              onValueChange={(value: any) => handleUpdateItem(item.id, { method: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="even">Even Split</SelectItem>
                                <SelectItem value="shares">By Shares</SelectItem>
                                <SelectItem value="percent">By Percent</SelectItem>
                                <SelectItem value="exact">Exact Amount</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-card-foreground mb-1 block">Split With</label>
                            <PersonSelector
                              selectedPeople={item.splitWith}
                              onSelectionChange={(selected) => handleUpdateItem(item.id, { splitWith: selected })}
                            />
                          </div>
                        </div>
                      </div>

                      {item.method !== "even" && (
                        <>
                          <Separator />
                          <SplitMethodInput
                            item={item}
                            people={people}
                            onCustomSplitsChange={(customSplits) =>
                              handleUpdateItem(item.id, { customSplits })
                            }
                          />
                        </>
                      )}

                      <Separator />
                      <div>
                        <label className="text-sm font-medium text-card-foreground mb-2 block">
                          Per Person Breakdown
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(splits).map(([personId, amount]) => {
                            const person = people.find((p) => p.id === personId)
                            return person ? (
                              <Badge key={personId} variant="secondary" className="justify-between p-2 h-auto">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: person.color }} />
                                  <span className="text-sm">{person.name}</span>
                                </div>
                                <span className="font-mono text-sm font-medium">
                                  ${(amount as number).toFixed(2)}
                                </span>
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}

            {/* Tax and Tip for Mobile */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-medium">Tax</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    step="0.01"
                    min="0"
                    value={tax}
                    onChange={handleTaxChange}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="h-9 w-24 font-mono text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-medium">Tip</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    step="0.01"
                    min="0"
                    value={tip}
                    onChange={handleTipChange}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="h-9 w-24 font-mono text-right"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      )}
      <CardFooter className="bg-muted/50 p-3 border-t">
        <div className="flex items-center justify-end gap-2 text-sm w-full">
          <span className="text-muted-foreground">Split Tax & Tip:</span>
          <Select value={taxTipAllocation} onValueChange={handleTaxTipAllocationChange}>
            <SelectTrigger className="h-8 w-32 border-input bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proportional">Proportionally</SelectItem>
              <SelectItem value="even">Evenly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardFooter>
    </Card>
  )
}
