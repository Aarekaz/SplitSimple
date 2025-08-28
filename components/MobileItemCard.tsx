"use client"

import React, { useState } from "react"
import { Edit, Trash2, Copy, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PersonChip } from "./PersonChip"
import { SplitMethodSelector } from "./SplitMethodSelector"
import { PersonSelector } from "./PersonSelector"
import { calculateItemSplits } from "@/lib/calculations"
import { validateCurrencyInput } from "@/lib/validation"
import { cn } from "@/lib/utils"
import type { Item, Person } from "@/contexts/BillContext"

interface MobileItemCardProps {
  item: Item
  people: Person[]
  onUpdate: (item: Item) => void
  onDelete: (itemId: string) => void
  onDuplicate: (item: Item) => void
  className?: string
}

export function MobileItemCard({ 
  item, 
  people, 
  onUpdate, 
  onDelete, 
  onDuplicate, 
  className 
}: MobileItemCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [localName, setLocalName] = useState(item.name)
  const [localPrice, setLocalPrice] = useState(item.price)

  const selectedPeople = people.filter(p => item.splitWith.includes(p.id))
  const itemSplits = calculateItemSplits(item, people)
  
  const handleSave = () => {
    const priceValidation = validateCurrencyInput(localPrice)
    if (priceValidation.isValid) {
      onUpdate({
        ...item,
        name: localName.trim() || "Untitled Item",
        price: priceValidation.value.toString(),
      })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalName(item.name)
    setLocalPrice(item.price)
    setIsEditing(false)
  }

  const handleSplitWithChange = (selectedIds: string[]) => {
    onUpdate({ ...item, splitWith: selectedIds })
  }

  const handleMethodChange = (method: "even" | "shares" | "percent" | "exact") => {
    onUpdate({ ...item, method, customSplits: {} })
  }

  const totalPrice = parseFloat(item.price) || 0

  return (
    <Card className={cn("group transition-all duration-200", className)}>
      <CardContent className="p-4">
        {/* Main Item Row */}
        <div className="space-y-3">
          {/* Item Name and Price */}
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Item name"
                className="h-10 text-base font-medium"
                autoFocus
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    value={localPrice}
                    onChange={(e) => setLocalPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-10 pl-8"
                    inputMode="decimal"
                  />
                </div>
                <Button size="sm" onClick={handleSave} className="px-6">
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base truncate">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-semibold">
                    ${totalPrice.toFixed(2)}
                  </span>
                  {item.quantity > 1 && (
                    <Badge variant="outline" className="text-xs">
                      ×{item.quantity}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-9 w-9 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDuplicate(item)}
                  className="h-9 w-9 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(item.id)}
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* People Chips - Always Visible */}
          {selectedPeople.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedPeople.map((person) => {
                const amount = itemSplits[person.id] || 0
                return (
                  <Badge key={person.id} variant="outline" className="text-xs">
                    <div 
                      className="w-2 h-2 rounded-full mr-2" 
                      style={{ backgroundColor: person.color }}
                    />
                    {person.name}: ${amount.toFixed(2)}
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-center h-8 text-sm"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Less Options
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                More Options
              </>
            )}
          </Button>
        </div>

        {/* Expanded Options */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Split Method */}
            <div>
              <label className="text-sm font-medium mb-2 block">Split Method</label>
              <SplitMethodSelector
                value={item.method}
                onValueChange={handleMethodChange}
              />
            </div>

            {/* People Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Split With</label>
              <PersonSelector
                selectedPeople={item.splitWith}
                onSelectionChange={handleSplitWithChange}
                size="sm"
              />
            </div>

            {/* Custom Split Inputs */}
            {item.method !== "even" && selectedPeople.length > 0 && totalPrice > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Custom Amounts</label>
                <div className="text-xs text-muted-foreground mb-2">
                  Total to split: ${totalPrice.toFixed(2)}
                </div>
                {/* This would integrate with SplitMethodInput component */}
                <div className="text-sm text-muted-foreground italic">
                  Custom split controls would go here
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}