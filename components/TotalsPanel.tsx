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
import { CompactPersonCard } from "./CompactPersonCard"
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
      
      <div className="space-y-2">
        {summary.personTotals.map((personTotal) => {
          const person = getPerson(personTotal.personId)
          if (!person) return null

          return (
            <CompactPersonCard
              key={person.id}
              person={person}
              personTotal={personTotal}
              itemBreakdowns={itemBreakdowns}
              totalBill={summary.total}
              onRemove={handleRemovePerson}
            />
          )
        })}
        
        {isAddingPerson && (
          <div className="thermal-person-card p-3">
            <AddPersonForm
              ref={personInputRef}
              onPersonAdded={() => setIsAddingPerson(false)}
              onCancel={() => setIsAddingPerson(false)}
            />
          </div>
        )}

        {!isAddingPerson && (
          <div
            onClick={() => setIsAddingPerson(true)}
            className="thermal-inline-add text-center"
          >
            + Add person...
          </div>
        )}

        {summary.personTotals.length === 0 && !isAddingPerson && (
          <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 mx-auto mb-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold mb-1 text-foreground text-sm">No people added yet</p>
            <p className="text-xs">Add people to start splitting</p>
          </div>
        )}
      </div>
    </div>
  )

  const BillSummaryPanel = () => (
    <div className="thermal-person-card p-4 space-y-2.5">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono font-semibold">
            {formatCurrency(summary.subtotal)}
          </span>
        </div>

        {summary.tax > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-mono font-semibold">{formatCurrency(summary.tax)}</span>
          </div>
        )}

        {summary.tip > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tip</span>
            <span className="font-mono font-semibold">{formatCurrency(summary.tip)}</span>
          </div>
        )}
        {summary.discount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-mono font-semibold text-green-600 dark:text-green-400">-{formatCurrency(summary.discount)}</span>
          </div>
        )}
      </div>

      <div className="thermal-separator-strong my-2"></div>

      <div className="flex justify-between items-center">
        <span className="text-base font-semibold">Total</span>
        <div className="font-mono font-bold text-xl">
          <AnimatedNumber
            value={summary.total}
            formatFn={(v) => formatCurrency(v)}
          />
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
