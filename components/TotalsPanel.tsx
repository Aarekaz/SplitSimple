"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { Users as UsersIcon, Plus, X, Calculator, Wallet } from "lucide-react"

import { useBill } from "@/contexts/BillContext"
import { getBillSummary, getItemBreakdowns } from "@/lib/calculations"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AddPersonForm } from "@/components/AddPersonForm"
import { AnimatedNumber } from "@/components/AnimatedNumber"

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
  const itemBreakdowns = getItemBreakdowns(state.currentBill)
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)

  useEffect(() => {
    setExpandedPerson(null)
  }, [state.currentBill.people])

  const handleRemovePerson = (personId: string) => {
    const person = state.currentBill.people.find((p) => p.id === personId)
    const hasAssignments = itemBreakdowns.some((item) => item.splits[personId] > 0)

    if (person && hasAssignments) {
      const count = itemBreakdowns.filter((item) => item.splits[personId] > 0).length
      const confirmed = window.confirm(
        `${person.name} is linked to ${count} item${count === 1 ? "" : "s"}. Remove and clear assignments?`
      )
      if (!confirmed) return
    }

    dispatch({ type: "REMOVE_PERSON", payload: personId })
  }

  const totalsBlock = (
    <section className="space-y-3 rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">Bill snapshot</span>
        <span className="badge-outline capitalize">{state.currentBill.status}</span>
      </div>
      <div className="grid gap-2 text-sm">
        <Row label="Subtotal" value={summary.subtotal} />
        {summary.tax > 0 && <Row label="Tax" value={summary.tax} />}
        {summary.tip > 0 && <Row label="Tip" value={summary.tip} />}
        {summary.discount > 0 && (
          <Row label="Discount" value={summary.discount * -1} tone="positive" />
        )}
      </div>
      <div className="border-t border-border/70 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Total</span>
          <div className="text-lg font-semibold text-foreground">
            <AnimatedNumber
              value={summary.total}
              duration={160}
              formatFn={(value) => formatCurrency(value)}
            />
          </div>
        </div>
      </div>
    </section>
  )

  const peopleBlock = (
    <section className="space-y-3 rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">Participants</span>
        {!isAddingPerson && (
          <Button
            size="sm"
            variant="secondary"
            className="border border-border text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
            onClick={() => setIsAddingPerson(true)}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      {state.currentBill.people.length === 0 && !isAddingPerson ? (
        <div className="rounded-md border border-dashed border-border/70 bg-surface-1 p-4 text-center text-sm text-muted-foreground">
          No people added yet
        </div>
      ) : null}

      <div className="space-y-2">
        {summary.personTotals.map((personTotal) => {
          const person = state.currentBill.people.find((p) => p.id === personTotal.personId)
          if (!person) return null
          const isExpanded = expandedPerson === person.id
          const assignments = itemBreakdowns.filter((item) => item.splits[person.id] > 0)

          return (
            <div
              key={person.id}
              className="rounded-md border border-border bg-surface-1/60 transition hover:border-accent/80"
            >
              <button
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-sm text-xs font-bold"
                    style={{
                      backgroundColor: `${person.color}22`,
                      color: person.color,
                    }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">{person.name}</p>
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
                      {assignments.length} item{assignments.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(personTotal.total)}
                  </span>
                  <button
                    className="rounded-sm border border-transparent p-1 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRemovePerson(person.id)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
              {isExpanded && assignments.length > 0 && (
                <div className="border-t border-border/70 px-3 py-3 text-xs text-muted-foreground">
                  <ul className="space-y-1.5">
                    {assignments.map((assignment) => (
                      <li key={assignment.itemId} className="flex justify-between gap-2">
                        <span className="truncate">{assignment.itemName}</span>
                        <span className="font-medium text-card-foreground">
                          {formatCurrency(assignment.splits[person.id])}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isAddingPerson && (
        <div className="rounded-md border border-border bg-surface-1 p-3">
          <AddPersonForm
            ref={personInputRef}
            onPersonAdded={() => setIsAddingPerson(false)}
            onCancel={() => setIsAddingPerson(false)}
          />
        </div>
      )}
    </section>
  )

  if (compact) {
    return (
      <div className="flex flex-col gap-4">
        {totalsBlock}
        {peopleBlock}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <HeaderStrip />
      {totalsBlock}
      {peopleBlock}
    </div>
  )
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "positive"
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "positive" ? "text-success" : "text-foreground"}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function HeaderStrip() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        <span className="micro-label text-muted-foreground">Control Summary</span>
      </div>
      <div className="flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
        <div className="flex items-center gap-1">
          <UsersIcon className="h-3.5 w-3.5" />
          Participants
        </div>
        <div className="flex items-center gap-1">
          <Wallet className="h-3.5 w-3.5" />
          Balances
        </div>
      </div>
    </div>
  )
}
