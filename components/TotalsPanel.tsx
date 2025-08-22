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

interface TotalsPanelProps {
  compact?: boolean
}

export function TotalsPanel({ compact = false }: TotalsPanelProps) {
  const { state, dispatch } = useBill()
  const summary = getBillSummary(state.currentBill)
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set())

  const itemBreakdowns = getItemBreakdowns(state.currentBill)

  const handleRemovePerson = (personId: string) => {
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

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const getPerson = (personId: string) => {
    return state.currentBill.people.find((p) => p.id === personId)
  }

  const peopleCount = state.currentBill.people.length
  const hasLargeAmounts = summary.total > 1000

  const PeoplePanel = () => (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          People
          {peopleCount > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">
              {peopleCount}
            </Badge>
          )}
        </h3>
        {!isAddingPerson && (
          <Button variant="outline" size="sm" onClick={() => setIsAddingPerson(true)} className="h-7 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      <div className="mt-4 space-y-1">
        {summary.personTotals.map((personTotal) => {
          const person = getPerson(personTotal.personId)
          if (!person) return null
          const isExpanded = expandedPeople.has(person.id)

          return (
            <div key={person.id} className="rounded-md transition-colors hover:bg-muted/50">
              <div
                className="flex items-center justify-between group p-2 cursor-pointer"
                onClick={() => togglePersonExpansion(person.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: person.color }} />
                  <span className="text-sm font-medium">{person.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {formatCurrency(personTotal.total)}
                  </Badge>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </div>
              {isExpanded && (
                <div className="pb-3 px-3 text-xs">
                  <ul className="space-y-1 text-muted-foreground list-disc pl-5 mb-2">
                    {itemBreakdowns
                      .filter((breakdown) => breakdown.splits[person.id] > 0)
                      .map((breakdown) => (
                        <li key={breakdown.itemId}>
                          <span className="font-medium text-foreground">{breakdown.itemName}</span>:{" "}
                          {formatCurrency(breakdown.splits[person.id])}
                        </li>
                      ))}
                  </ul>

                  <Separator className="my-2" />

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatCurrency(personTotal.subtotal)}</span>
                    </div>
                    {personTotal.tax > 0 && (
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span className="font-mono">{formatCurrency(personTotal.tax)}</span>
                      </div>
                    )}
                    {personTotal.tip > 0 && (
                      <div className="flex justify-between">
                        <span>Tip</span>
                        <span className="font-mono">{formatCurrency(personTotal.tip)}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePerson(person.id)}
                    className="h-6 w-auto px-1 mt-2 text-destructive hover:text-destructive text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove {person.name}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
        {isAddingPerson && (
          <div className="pt-2">
            <AddPersonForm onPersonAdded={() => setIsAddingPerson(false)} onCancel={() => setIsAddingPerson(false)} />
          </div>
        )}

        {summary.personTotals.length === 0 && !isAddingPerson && (
          <div className="py-6 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Add people to the bill</p>
          </div>
        )}
      </div>
    </>
  )

  const BillSummaryPanel = () => (
    <>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Receipt className="h-4 w-4" />
        Bill Summary
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span className={`font-mono ${hasLargeAmounts ? "text-xs" : ""}`}>
            {formatCurrency(summary.subtotal)}
          </span>
        </div>

        {summary.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span className={`font-mono ${hasLargeAmounts ? "text-xs" : ""}`}>{formatCurrency(summary.tax)}</span>
          </div>
        )}

        {summary.tip > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tip:</span>
            <span className={`font-mono ${hasLargeAmounts ? "text-xs" : ""}`}>{formatCurrency(summary.tip)}</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between font-semibold">
          <span>Total:</span>
          <span className={`font-mono ${hasLargeAmounts ? "text-base" : "text-lg"}`}>
            {formatCurrency(summary.total)}
          </span>
        </div>
      </div>
    </>
  )

  if (compact) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4">
            <PeoplePanel />
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-4">
            <BillSummaryPanel />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <PeoplePanel />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <BillSummaryPanel />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {state.currentBill.items.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div
              className={`grid ${
                state.currentBill.items.length > 10 || peopleCount > 10 ? "grid-cols-3" : "grid-cols-2"
              } gap-4 text-center`}
            >
              <div>
                <div className="text-2xl font-bold text-primary">{state.currentBill.items.length}</div>
                <div className="text-xs text-muted-foreground">Items</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{peopleCount}</div>
                <div className="text-xs text-muted-foreground">People</div>
              </div>
              {peopleCount > 0 && (state.currentBill.items.length > 10 || peopleCount > 10) && (
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(summary.total / peopleCount).replace(/[^0-9.]/g, "")}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg/Person</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
