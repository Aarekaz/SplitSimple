"use client"

import type React from "react"
import { useState } from "react"
import { Trash2, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PersonSelector } from "./PersonSelector"
import { SplitMethodInput } from "./SplitMethodInput"
import type { Item, Person } from "@/contexts/BillContext"
import { calculateItemSplits, evaluatePrice } from "@/lib/calculations"

interface ItemRowProps {
  item: Item
  people: Person[]
  onUpdate: (item: Item) => void
  onDelete: (itemId: string) => void
}

export function ItemRow({ item, people, onUpdate, onDelete }: ItemRowProps) {
  const [priceInput, setPriceInput] = useState(item.price.toString())
  const [isExpanded, setIsExpanded] = useState(false)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...item, name: e.target.value })
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setPriceInput(input)
    const evaluatedPrice = evaluatePrice(input)
    onUpdate({ ...item, price: evaluatedPrice })
  }

  const handleSplitWithChange = (selectedIds: string[]) => {
    onUpdate({ ...item, splitWith: selectedIds })
  }

  const handleMethodChange = (method: "even" | "shares" | "percent" | "exact") => {
    onUpdate({ ...item, method, customSplits: {} })
  }

  const handleCustomSplitsChange = (customSplits: Record<string, number>) => {
    onUpdate({ ...item, customSplits })
  }

  const itemSplits = calculateItemSplits(item, people)
  const selectedPeople = people.filter((p) => item.splitWith.includes(p.id))

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Input
                  value={item.name}
                  onChange={handleNameChange}
                  placeholder="Item name"
                  className="h-9 text-sm font-medium"
                />
                <div className="text-xs text-muted-foreground whitespace-nowrap">${item.price.toFixed(2)}</div>
              </div>
              {!isExpanded && selectedPeople.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">Split:</span>
                  <div className="flex gap-1">
                    {selectedPeople.slice(0, 3).map((person) => (
                      <div
                        key={person.id}
                        className="w-4 h-4 rounded-full border border-white"
                        style={{ backgroundColor: person.color }}
                        title={`${person.name}: $${(itemSplits[person.id] || 0).toFixed(2)}`}
                      />
                    ))}
                    {selectedPeople.length > 3 && (
                      <div className="text-xs text-muted-foreground">+{selectedPeople.length - 3}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-9 px-2 text-xs">
              {isExpanded ? "Less" : "Edit"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete item</span>
            </Button>
          </div>

          {isExpanded && (
            <>
              {/* Price and Method Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Price</label>
                  <div className="relative">
                    <Input
                      value={priceInput}
                      onChange={handlePriceChange}
                      placeholder="0.00 or 7.48/2"
                      className="h-9 pr-10 text-sm"
                      inputMode="decimal"
                    />
                    <Calculator className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  {priceInput !== item.price.toString() && (
                    <div className="text-xs text-muted-foreground mt-1">= ${item.price.toFixed(2)}</div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Split Method</label>
                  <Select value={item.method} onValueChange={handleMethodChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="even">Even Split</SelectItem>
                      <SelectItem value="shares">By Shares</SelectItem>
                      <SelectItem value="percent">By Percent</SelectItem>
                      <SelectItem value="exact">Exact Amounts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Split With */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Split With</label>
                <PersonSelector selectedPeople={item.splitWith} onSelectionChange={handleSplitWithChange} size="sm" />
              </div>

              {/* Custom Split Inputs */}
              {item.method !== "even" && selectedPeople.length > 0 && (
                <div className="pt-4 border-t">
                  <SplitMethodInput item={item} people={people} onCustomSplitsChange={handleCustomSplitsChange} />
                </div>
              )}

              {/* Per-Person Amounts */}
              {selectedPeople.length > 0 && item.price > 0 && (
                <div className="pt-4 border-t">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Per Person</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedPeople.map((person) => {
                      const amount = itemSplits[person.id] || 0
                      return (
                        <Badge key={person.id} variant="outline" className="text-xs py-1">
                          <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: person.color }} />
                          {person.name}: ${amount.toFixed(2)}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
