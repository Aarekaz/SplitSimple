"use client"

import { CheckSquare, Square, RotateCcw } from "lucide-react"
import { PersonChip } from "./PersonChip"
import { useBill } from "@/contexts/BillContext"
import { cn } from "@/lib/utils"

interface PersonSelectorProps {
  selectedPeople: string[]
  onSelectionChange: (selectedIds: string[]) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PersonSelector({ 
  selectedPeople, 
  onSelectionChange, 
  size = "sm", 
  className 
}: PersonSelectorProps) {
  const { state } = useBill()

  const handleTogglePerson = (personId: string) => {
    const newSelection = selectedPeople.includes(personId)
      ? selectedPeople.filter((id) => id !== personId)
      : [...selectedPeople, personId]

    onSelectionChange(newSelection)
  }

  if (state.currentBill.people.length === 0) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Split With</label>
        <div className="text-xs text-muted-foreground italic p-3 border border-dashed rounded-lg text-center">
          Add people first to split expenses
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Split With</label>
        <div className="text-xs text-muted-foreground">
          {selectedPeople.length} of {state.currentBill.people.length} selected
        </div>
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
