"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Calculator, Users, Receipt, Plus, X, ChevronDown } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { getBillSummary, getItemBreakdowns } from "@/lib/calculations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddPersonForm } from "./AddPersonForm"
import { useEffect, forwardRef } from "react"
import { formatCurrency } from "@/lib/utils"
import { AnimatedNumber } from "./AnimatedNumber"
import { BillStatusIndicator } from "./BillStatusIndicator"
import { SyncStatusIndicator } from "./SyncStatusIndicator"

interface TotalsPanelProps {
  compact?: boolean
  isAddingPerson: boolean
  setIsAddingPerson: (isAdding: boolean) => void
  personInputRef: React.Ref<HTMLInputElement>
}

export function TotalsPanel({
  compact = false,
  isAddingPerson,
  setIsAddingPerson,
  personInputRef,
}: TotalsPanelProps) {
  const { state, dispatch } = useBill()
  const summary = getBillSummary(state.currentBill)
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set())

  const itemBreakdowns = getItemBreakdowns(state.currentBill)

  useEffect(() => {
    // Always start with collapsed people - user can expand manually
    setExpandedPeople(new Set())
  }, [state.currentBill.people])

  const handleRemovePerson = (personId: string) => {
    const person = state.currentBill.people.find(p => p.id === personId)
    const hasItems = itemBreakdowns.some(breakdown => breakdown.splits[personId] > 0)
    
    if (hasItems && person) {
      const itemCount = itemBreakdowns.filter(breakdown => breakdown.splits[personId] > 0).length
      const confirmed = window.confirm(
        `${person.name} is assigned to ${itemCount} item${itemCount > 1 ? 's' : ''}. Are you sure you want to remove them? This will unassign them from all items.`
      )
      if (!confirmed) return
    }
    
    dispatch({ type: "REMOVE_PERSON", payload: personId })
  }

  const togglePersonExpansion = (personId: string) => {
    const newExpanded = new Set(expandedPeople)
    if (newExpanded.has(personId)) {
      newExpanded.delete(personId)
    } else {
      newExpanded.add(personId)
    }
    setExpandedPeople(newExpanded)
  }

  const getPerson = (personId: string) => {
    return state.currentBill.people.find((p) => p.id === personId)
  }

  const peopleCount = state.currentBill.people.length
  const hasLargeAmounts = summary.total > 1000

  const PeoplePanel = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">People</h3>
            {peopleCount > 0 && (
              <p className="text-xs text-muted-foreground">{peopleCount} member{peopleCount > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {!isAddingPerson && (
          <Button size="sm" onClick={() => setIsAddingPerson(true)} className="h-8 px-3 text-xs shadow-sm">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {summary.personTotals.map((personTotal) => {
          const person = getPerson(personTotal.personId)
          if (!person) return null
          const isExpanded = expandedPeople.has(person.id)

          return (
            <div key={person.id} className="rounded-lg border bg-card transition-all hover:shadow-sm group">
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => togglePersonExpansion(person.id)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                    style={{ 
                      backgroundColor: person.color,
                      boxShadow: `0 2px 8px ${person.color}25, 0 0 0 1px ${person.color}20`
                    }} 
                  />
                  <div>
                    <p className="text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {itemBreakdowns.filter(breakdown => breakdown.splits[person.id] > 0).length} item{itemBreakdowns.filter(breakdown => breakdown.splits[person.id] > 0).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemovePerson(person.id)
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <div className="text-right">
                    <div className="receipt-amount text-sm">
                      <AnimatedNumber 
                        value={personTotal.total}
                        formatFn={(v) => formatCurrency(v)}
                        duration={150}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {summary.total > 0 ? `${((personTotal.total / summary.total) * 100).toFixed(0)}%` : '0%'}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 border-t bg-muted/20">
                  <div className="pt-3 space-y-2 text-xs">
                    {itemBreakdowns
                      .filter((breakdown) => breakdown.splits[person.id] > 0)
                      .map((breakdown) => (
                        <div key={breakdown.itemId} className="flex justify-between items-center py-1">
                          <span className="font-medium">{breakdown.itemName}</span>
                          <span className="receipt-subtotal text-muted-foreground">
                            {formatCurrency(breakdown.splits[person.id])}
                          </span>
                        </div>
                      ))}
                    
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="receipt-subtotal">{formatCurrency(personTotal.subtotal)}</span>
                      </div>
                      {personTotal.tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="receipt-subtotal">{formatCurrency(personTotal.tax)}</span>
                        </div>
                      )}
                      {personTotal.tip > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tip</span>
                          <span className="receipt-subtotal">{formatCurrency(personTotal.tip)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        
        {isAddingPerson && (
          <div className="rounded-lg border bg-card p-3">
            <AddPersonForm
              ref={personInputRef}
              onPersonAdded={() => setIsAddingPerson(false)}
              onCancel={() => setIsAddingPerson(false)}
            />
          </div>
        )}

        {summary.personTotals.length === 0 && !isAddingPerson && (
          <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mx-auto mb-3">
              <Users className="h-6 w-6" />
            </div>
            <p className="font-medium mb-1">No people added yet</p>
            <p className="text-xs">Add people to start splitting the bill</p>
          </div>
        )}
      </div>
    </div>
  )

  const BillSummaryPanel = () => (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="receipt-subtotal">
            {formatCurrency(summary.subtotal)}
          </span>
        </div>

        {summary.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="receipt-subtotal">{formatCurrency(summary.tax)}</span>
          </div>
        )}

        {summary.tip > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tip</span>
            <span className="receipt-subtotal">{formatCurrency(summary.tip)}</span>
          </div>
        )}
        {summary.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="receipt-subtotal text-green-600 dark:text-green-400">-{formatCurrency(summary.discount)}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total</span>
          <div className="receipt-total text-green-600 dark:text-green-400">
            <AnimatedNumber 
              value={summary.total}
              formatFn={(v) => formatCurrency(v)}
            />
          </div>
        </div>
      </div>
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-6 p-4">
        <PeoplePanel />
        <div className="border-t border-border/50 my-6"></div>
        <BillSummaryPanel />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <PeoplePanel />
      <div className="border-t border-border/50 my-6"></div>
      <BillSummaryPanel />
    </div>
  )
}
