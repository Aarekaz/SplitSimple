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
import { AnimatedCurrency } from "@/components/AnimatedCurrency"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

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
  const { toast } = useToast()
  const summary = getBillSummary(state.currentBill)
  const itemBreakdowns = getItemBreakdowns(state.currentBill)
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)
  const [newPeople, setNewPeople] = useState<Set<string>>(new Set())
  const [removingPeople, setRemovingPeople] = useState<Set<string>>(new Set())
  const [previousPeopleCount, setPreviousPeopleCount] = useState(state.currentBill.people.length)

  useEffect(() => {
    setExpandedPerson(null)
  }, [state.currentBill.people])

  // Track newly added people for animation and contextual actions
  useEffect(() => {
    const currentCount = state.currentBill.people.length
    const previousCount = previousPeopleCount
    
    if (currentCount > previousCount) {
      // Person was added
    const currentIds = new Set(state.currentBill.people.map(p => p.id))
    const previousIds = new Set([...newPeople].filter(id => !currentIds.has(id)))
    
    // Find truly new people (not in newPeople set yet)
    const freshlyAdded = state.currentBill.people
      .filter(p => !newPeople.has(p.id))
      .map(p => p.id)
    
    if (freshlyAdded.length > 0) {
      setNewPeople(new Set([...newPeople, ...freshlyAdded]))
        
        // Show contextual toast if there are items to assign to
        if (state.currentBill.items.length > 0) {
          const newPerson = state.currentBill.people.find(p => freshlyAdded.includes(p.id))
          if (newPerson) {
            toast({
              title: `${newPerson.name} added!`,
              description: "Would you like to assign them to items?",
              action: (
                <ToastAction
                  altText="Assign to items"
                  onClick={() => {
                    // Scroll to first item or show assignment hint
                    const firstItemElement = document.querySelector('[data-item-input="name"]')
                    if (firstItemElement) {
                      firstItemElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }}
                >
                  Assign to items
                </ToastAction>
              )
            })
          }
        } else if (currentCount === 1) {
          // First person added - show guidance
          toast({
            title: "Great! Now add some items",
            description: "You can start logging items to split with this person.",
            action: (
              <ToastAction
                altText="Add first item"
                onClick={() => {
                  // Trigger add item action
                  const addItemButton = document.querySelector('[data-action="add-item"]')
                  if (addItemButton) {
                    (addItemButton as HTMLElement).click()
                  }
                }}
              >
                Add first item
              </ToastAction>
            )
          })
        }
        
      // Remove animation class after animation completes
      setTimeout(() => {
        setNewPeople(prev => {
          const updated = new Set(prev)
          freshlyAdded.forEach(id => updated.delete(id))
          return updated
        })
      }, 400)
    }
    }
    
    setPreviousPeopleCount(currentCount)
  }, [state.currentBill.people.length, previousPeopleCount, newPeople, state.currentBill.items.length, toast])

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

    // Add removing animation
    setRemovingPeople(prev => new Set([...prev, personId]))
    setTimeout(() => {
      dispatch({ type: "REMOVE_PERSON", payload: personId })
      setRemovingPeople(prev => {
        const updated = new Set(prev)
        updated.delete(personId)
        return updated
      })
    }, 200)
  }

  const totalsBlock = (
    <section className="space-y-3 rounded-lg border border-border bg-surface-2 p-4 shadow-sm">
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
    <section className={`space-y-3 rounded-lg border p-4 shadow-sm transition-all duration-200 ${
      isAddingPerson 
        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
        : 'border-border bg-surface-2'
    }`}>
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">Participants</span>
        {!isAddingPerson && (
          <Button
            size="sm"
            variant="secondary"
            className="border border-border text-[0.68rem] font-semibold uppercase tracking-[0.18em] rainbow-border-hover"
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

      <div className="space-y-2" role="list" aria-label="Bill participants and their totals">
        {summary.personTotals.map((personTotal) => {
          const person = state.currentBill.people.find((p) => p.id === personTotal.personId)
          if (!person) return null
          const isExpanded = expandedPerson === person.id
          const assignments = itemBreakdowns.filter((item) => item.splits[person.id] > 0)

          return (
            <div
              key={person.id}
              role="listitem"
              className={`rounded-md border border-border bg-surface-1/60 shadow-sm transition-all-moderate hover:border-accent/80 hover:shadow-md ${newPeople.has(person.id) ? 'animate-slide-in-down' : ''} ${removingPeople.has(person.id) ? 'animate-scale-out' : ''}`}
              aria-label={`${person.name}: ${formatCurrency(personTotal.total)}`}
            >
              <button
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${person.name}`}
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
                  <AnimatedCurrency 
                    value={personTotal.total} 
                    className="font-semibold text-foreground"
                  />
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
              <div className="overflow-hidden transition-all-moderate">
                {isExpanded && assignments.length > 0 && (
                  <div className="border-t border-border/70 px-3 py-3 text-xs text-muted-foreground animate-slide-in-down">
                    <ul className="space-y-1.5">
                      {assignments.map((assignment) => (
                        <li key={assignment.itemId} className="flex justify-between gap-2">
                        <span className="truncate">{assignment.itemName}</span>
                        <AnimatedCurrency 
                          value={assignment.splits[person.id]} 
                          className="font-medium text-card-foreground"
                        />
                      </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isAddingPerson && (
        <div className="space-y-2">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-center">
            <p className="text-xs text-primary font-medium">✨ Add a new person below</p>
          </div>
        <div className="rounded-md border border-border bg-surface-1 p-3">
          <AddPersonForm
            ref={personInputRef}
            onPersonAdded={() => setIsAddingPerson(false)}
            onCancel={() => setIsAddingPerson(false)}
          />
          </div>
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
      <AnimatedCurrency 
        value={value} 
        className={tone === "positive" ? "text-success" : "text-foreground"}
      />
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
