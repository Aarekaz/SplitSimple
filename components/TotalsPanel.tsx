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
import { Progress } from "@/components/ui/progress"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { Input } from "@/components/ui/input"
import { AddPersonForm } from "./AddPersonForm"
import { useEffect, forwardRef } from "react"
import { formatCurrency } from "@/lib/utils"
import { AnimatedNumber } from "./AnimatedNumber"
import { BillStatusIndicator } from "./BillStatusIndicator"
import { SyncStatusIndicator } from "./SyncStatusIndicator"
import { EmptyPeopleState } from "./EmptyStates"
import { ProgressIndicator, BillHealthIndicator } from "./ui/visual-feedback"

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
  const analytics = useBillAnalytics()
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
      if (!confirmed) {
        analytics.trackFeatureUsed("remove_person_cancelled", { had_items_assigned: true })
        return
      }
    }
    
    dispatch({ type: "REMOVE_PERSON", payload: personId })
    analytics.trackPersonRemoved(hasItems)
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
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">People</h3>
            {peopleCount > 0 && (
              <p className="text-xs text-muted-foreground">{peopleCount} member{peopleCount > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {!isAddingPerson && (
          <Button 
            size="sm" 
            onClick={() => setIsAddingPerson(true)} 
            className="h-9 px-4 btn-float rounded-xl bg-gradient-to-br from-primary to-primary/90 hover:from-primary-600 hover:to-primary/80 text-white font-medium"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
        )}
      </div>
      
      <div className="space-y-2.5">
        {summary.personTotals.map((personTotal) => {
          const person = getPerson(personTotal.personId)
          if (!person) return null
          const isExpanded = expandedPeople.has(person.id)

          return (
            <div key={person.id} className="float-card-sm border-0 hover:shadow-md transition-all duration-300 group">
              <div className="space-y-2">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => togglePersonExpansion(person.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                      style={{ 
                        backgroundColor: person.color,
                        boxShadow: `0 4px 12px ${person.color}30`
                      }} 
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{person.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {itemBreakdowns.filter(breakdown => breakdown.splits[person.id] > 0).length} item{itemBreakdowns.filter(breakdown => breakdown.splits[person.id] > 0).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemovePerson(person.id)
                      }}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="text-right">
                      <div className="receipt-amount text-sm font-bold">
                        <AnimatedNumber 
                          value={personTotal.total}
                          formatFn={(v) => formatCurrency(v)}
                          duration={150}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {summary.total > 0 ? `${((personTotal.total / summary.total) * 100).toFixed(0)}%` : '0%'}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>
                {/* Progress bar */}
                {summary.total > 0 && (
                  <div className="px-4 pb-3">
                    <Progress 
                      value={(personTotal.total / summary.total) * 100} 
                      className="h-2 rounded-full"
                      style={{
                        ['--progress-background' as any]: person.color,
                      }}
                    />
                  </div>
                )}
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t bg-muted/20">
                  <div className="pt-4 space-y-2 text-xs">
                    {itemBreakdowns
                      .filter((breakdown) => breakdown.splits[person.id] > 0)
                      .map((breakdown) => {
                        const item = state.currentBill.items.find(i => i.id === breakdown.itemId)
                        const quantity = item?.quantity || 1
                        const displayName = quantity > 1 ? `${breakdown.itemName} (×${quantity})` : breakdown.itemName
                        
                        return (
                          <div key={breakdown.itemId} className="flex justify-between items-center py-1">
                            <span className="font-medium">{displayName}</span>
                            <span className="receipt-subtotal text-muted-foreground">
                              {formatCurrency(breakdown.splits[person.id])}
                            </span>
                          </div>
                        )
                      })}
                    
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
          <div className="float-card-sm border-0 p-4">
            <AddPersonForm
              ref={personInputRef}
              onPersonAdded={() => setIsAddingPerson(false)}
              onCancel={() => setIsAddingPerson(false)}
            />
          </div>
        )}

        {summary.personTotals.length === 0 && !isAddingPerson && (
          <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/20">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mx-auto mb-4">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <p className="font-semibold mb-1.5 text-foreground">No people added yet</p>
            <p className="text-sm">Add people to start splitting the bill</p>
          </div>
        )}
      </div>
    </div>
  )

  const BillSummaryPanel = () => (
    <div className="float-card-sm border-0 hover:shadow-md transition-all duration-300">
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Bill Summary</h3>
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-between text-sm items-center py-1">
            <span className="text-muted-foreground font-medium">Subtotal</span>
            <span className="receipt-subtotal font-semibold">
              {formatCurrency(summary.subtotal)}
            </span>
          </div>

          {summary.tax > 0 && (
            <div className="flex justify-between text-sm items-center py-1">
              <span className="text-muted-foreground font-medium">Tax</span>
              <span className="receipt-subtotal font-semibold">{formatCurrency(summary.tax)}</span>
            </div>
          )}

          {summary.tip > 0 && (
            <div className="flex justify-between text-sm items-center py-1">
              <span className="text-muted-foreground font-medium">Tip</span>
              <span className="receipt-subtotal font-semibold">{formatCurrency(summary.tip)}</span>
            </div>
          )}
          {summary.discount > 0 && (
            <div className="flex justify-between text-sm items-center py-1">
              <span className="text-muted-foreground font-medium">Discount</span>
              <span className="receipt-subtotal text-green-600 dark:text-green-400 font-semibold">-{formatCurrency(summary.discount)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <div className="receipt-total text-primary font-bold">
              <AnimatedNumber
                value={summary.total}
                formatFn={(v) => formatCurrency(v)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-5">
        <PeoplePanel />
        <div className="border-t border-border/50"></div>
        <BillSummaryPanel />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PeoplePanel />
      <div className="border-t border-border/50"></div>
      <BillSummaryPanel />
    </div>
  )
}
