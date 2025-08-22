"use client"

import { Button } from "@/components/ui/button"
import { PersonChip } from "./PersonChip"
import { useBill } from "@/contexts/BillContext"

interface PersonSelectorProps {
  selectedPeople: string[]
  onSelectionChange: (selectedIds: string[]) => void
  size?: "sm" | "md" | "lg"
}

export function PersonSelector({ selectedPeople, onSelectionChange, size = "sm" }: PersonSelectorProps) {
  const { state } = useBill()

  const handleTogglePerson = (personId: string) => {
    const newSelection = selectedPeople.includes(personId)
      ? selectedPeople.filter((id) => id !== personId)
      : [...selectedPeople, personId]

    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    onSelectionChange(state.currentBill.people.map((p) => p.id))
  }

  const handleSelectNone = () => {
    onSelectionChange([])
  }

  const handleInvertSelection = () => {
    const unselected = state.currentBill.people.filter((p) => !selectedPeople.includes(p.id)).map((p) => p.id)
    onSelectionChange(unselected)
  }

  if (state.currentBill.people.length === 0) {
    return <div className="text-xs text-muted-foreground italic">Add people first to split expenses</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8 px-3 text-xs">
          All
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSelectNone} className="h-8 px-3 text-xs">
          None
        </Button>
        <Button variant="ghost" size="sm" onClick={handleInvertSelection} className="h-8 px-3 text-xs">
          Invert
        </Button>
      </div>

      {/* Person chips */}
      <div className="flex flex-wrap gap-2">
        {state.currentBill.people.map((person) => (
          <PersonChip
            key={person.id}
            person={person}
            isSelected={selectedPeople.includes(person.id)}
            onToggle={handleTogglePerson}
            showRemove={false}
            size={size}
          />
        ))}
      </div>
    </div>
  )
}
