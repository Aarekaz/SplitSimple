"use client"

import React, { useState, useRef } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBill } from "@/contexts/BillContext"
import { getBillSummary } from "@/lib/calculations"
import { formatCurrency } from "@/lib/utils"
import { AddPersonForm } from "./AddPersonForm"

export function PeopleBreakdownTable() {
  const { state, dispatch } = useBill()
  const { people, items } = state.currentBill
  const summary = getBillSummary(state.currentBill)
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const personInputRef = useRef<HTMLInputElement>(null)

  const handleAddPerson = () => {
    setIsAddingPerson(true)
    setTimeout(() => personInputRef.current?.focus(), 100)
  }

  const handleRemovePerson = (personId: string) => {
    dispatch({ type: "REMOVE_PERSON", payload: personId })
  }

  if (people.length === 0) {
    return (
      <div className="receipt-container">
        <div className="receipt-section-header flex justify-between items-center">
          <span>PEOPLE BREAKDOWN</span>
          {!isAddingPerson && (
            <Button
              onClick={handleAddPerson}
              size="sm"
              className="h-8 px-3 receipt-button text-xs font-bold uppercase"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Person
            </Button>
          )}
        </div>
        <div className="p-8 text-center">
          {isAddingPerson ? (
            <AddPersonForm
              ref={personInputRef}
              onPersonAdded={() => setIsAddingPerson(false)}
              onCancel={() => setIsAddingPerson(false)}
            />
          ) : (
            <div className="text-muted-foreground text-sm space-y-2">
              <p className="font-medium">No people added yet</p>
              <p className="text-xs">Add people to split the bill</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const grandTotal = summary.total

  return (
    <div className="receipt-container">
      {/* Section Header */}
      <div className="receipt-section-header flex justify-between items-center">
        <span>PEOPLE BREAKDOWN</span>
        {!isAddingPerson && (
          <Button
            onClick={handleAddPerson}
            size="sm"
            className="h-8 px-3 receipt-button text-xs font-bold uppercase"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Person
          </Button>
        )}
      </div>

      {/* Add Person Form */}
      {isAddingPerson && (
        <div className="p-4 border-b border-border bg-muted/20">
          <AddPersonForm
            ref={personInputRef}
            onPersonAdded={() => setIsAddingPerson(false)}
            onCancel={() => setIsAddingPerson(false)}
          />
        </div>
      )}

      {/* People Table */}
      <div className="overflow-x-auto">
        <table className="ledger-table">
          <thead className="ledger-header">
            <tr>
              <th className="ledger-header-cell text-left">Person</th>
              <th className="ledger-header-cell-right min-w-[120px]">Subtotal</th>
              <th className="ledger-header-cell-right min-w-[80px]">Items</th>
              <th className="ledger-header-cell min-w-[200px]">Share</th>
              <th className="ledger-header-cell min-w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const personTotal = summary.personTotals.find(pt => pt.personId === person.id)
              const subtotal = personTotal?.subtotal || 0
              const itemCount = items.filter(item => item.splitWith.includes(person.id)).length
              const percentage = grandTotal > 0 ? (subtotal / summary.subtotal) * 100 : 0
              const filledBlocks = Math.round((percentage / 100) * 12) // 12 blocks for full bar

              return (
                <tr key={person.id} className="ledger-row group">
                  {/* Person Name */}
                  <td className="ledger-cell">
                    <div className="flex items-center gap-2">
                      <div
                        className="person-dot"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{person.name}</span>
                    </div>
                  </td>

                  {/* Subtotal */}
                  <td className="ledger-cell-number font-bold" style={{ color: person.color }}>
                    {formatCurrency(subtotal)}
                  </td>

                  {/* Item Count */}
                  <td className="ledger-cell-number text-muted-foreground">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </td>

                  {/* Share Percentage with Bar */}
                  <td className="ledger-cell">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      {/* Proportion Bar */}
                      <div className="flex gap-0.5 h-2">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm transition-all"
                            style={{
                              backgroundColor: i < filledBlocks ? person.color : 'transparent',
                              opacity: i < filledBlocks ? 0.6 : 0.2,
                              border: `1px solid ${person.color}40`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="ledger-cell">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePerson(person.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      title={`Remove ${person.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
