"use client"

import { CheckSquare, Square, RotateCcw } from "lucide-react"
import { PersonChip } from "./PersonChip"
import { useBill } from "@/contexts/BillContext"
import { cn } from "@/lib/utils"

interface EnhancedPersonSelectorProps {
  selectedPeople: string[]
  onSelectionChange: (selectedIds: string[]) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

const quickActions = [
  {
    id: "all",
    label: "All",
    icon: CheckSquare,
    description: "Select everyone",
  },
  {
    id: "none",
    label: "None",
    icon: Square,
    description: "Deselect all",
  },
  {
    id: "invert",
    label: "Invert",
    icon: RotateCcw,
    description: "Flip selection",
  },
] as const

export function EnhancedPersonSelector({ 
  selectedPeople, 
  onSelectionChange, 
  size = "sm", 
  className 
}: EnhancedPersonSelectorProps) {
  const { state } = useBill()

  const handleTogglePerson = (personId: string) => {
    const newSelection = selectedPeople.includes(personId)
      ? selectedPeople.filter((id) => id !== personId)
      : [...selectedPeople, personId]

    onSelectionChange(newSelection)
  }

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case "all":
        onSelectionChange(state.currentBill.people.map((p) => p.id))
        break
      case "none":
        onSelectionChange([])
        break
      case "invert":
        const unselected = state.currentBill.people
          .filter((p) => !selectedPeople.includes(p.id))
          .map((p) => p.id)
        onSelectionChange(unselected)
        break
    }
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

      {/* Quick Action Controls */}
      <div className="flex rounded-lg border bg-muted/20 p-1">
        {quickActions.map((action, index) => {
          const Icon = action.icon
          const isActive = 
            (action.id === "all" && selectedPeople.length === state.currentBill.people.length) ||
            (action.id === "none" && selectedPeople.length === 0)
          
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleQuickAction(action.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all text-xs font-medium",
                "hover:bg-background hover:shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                isActive
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={action.description}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{action.label}</span>
            </button>
          )
        })}
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
