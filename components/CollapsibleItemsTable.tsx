"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useBill } from "@/contexts/BillContext"
import { PersonSelector } from "./PersonSelector"
import { SplitMethodInput } from "./SplitMethodInput"
import { calculateItemSplits } from "@/lib/calculations"

export function CollapsibleItemsTable() {
  const { state, dispatch } = useBill()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)

  const items = state.currentBill.items
  const people = state.currentBill.people

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const handleAddItem = () => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        name: "",
        price: 0,
        splitWith: [],
        method: "even" as const,
        customSplits: {},
      },
    })
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

  if (items.length === 0) {
    return (
      <Card className="text-center">
        <CardContent className="pt-8 pb-8">
          <Calculator className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No items added yet</CardTitle>
          <p className="text-muted-foreground mb-4">Add items to start splitting expenses</p>
          <Button onClick={handleAddItem}>
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
          <Button onClick={handleAddItem} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-[200px_100px_200px_150px_60px] gap-px bg-border text-sm font-medium text-muted-foreground">
              <div className="bg-muted/50 p-3">Item Name</div>
              <div className="bg-muted/50 p-3">Price</div>
              <div className="bg-muted/50 p-3">Split With</div>
              <div className="bg-muted/50 p-3">Per Person</div>
              <div className="bg-muted/50 p-3"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {items.map((item) => {
                const isExpanded = expandedItems.has(item.id)
                const splits = getItemSplits(item.id)
                const selectedPeople = getSelectedPeople(item.id)

                return (
                  <div key={item.id} className="bg-background">
                    {/* Collapsed Row */}
                    <div
                      className="grid grid-cols-[200px_100px_200px_150px_60px] gap-px cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleItemExpansion(item.id)}
                    >
                      <div className="p-3 flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium truncate">{item.name || "Unnamed Item"}</span>
                      </div>
                      <div className="p-3 font-mono">${item.price.toFixed(2)}</div>
                      <div className="p-3">
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
                      <div className="p-3">
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
                      <Card className="m-4 border-t-0 rounded-t-none">
                        <CardContent className="pt-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Item Details */}
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium text-card-foreground mb-1 block">Item Name</label>
                                <Input
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                  placeholder="Enter item name"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-card-foreground mb-1 block">Price</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, { price: Number.parseFloat(e.target.value) || 0 })
                                  }
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
                                onUpdate={(updates) => handleUpdateItem(item.id, updates)}
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
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
