"use client"

import { useState, useRef, useEffect } from "react"
import { CheckSquare, Square, RotateCcw, Plus, X } from "lucide-react"
import { PersonChip } from "./PersonChip"
import { useBill } from "@/contexts/BillContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { validatePersonName } from "@/lib/validation"
import { useToast } from "@/hooks/use-toast"

interface PersonSelectorProps {
  selectedPeople: string[]
  onSelectionChange: (selectedIds: string[]) => void
  size?: "sm" | "md" | "lg"
  className?: string
  showQuickAdd?: boolean
  onPersonAdded?: (personId: string) => void
}

export function PersonSelector({ 
  selectedPeople, 
  onSelectionChange, 
  size = "sm", 
  className,
  showQuickAdd = false,
  onPersonAdded
}: PersonSelectorProps) {
  const { state, dispatch } = useBill()
  const { toast } = useToast()
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState("")
  const [validationError, setValidationError] = useState<string>("")
  const [showSuccess, setShowSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAddingPerson) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isAddingPerson])

  const handleAddPerson = () => {
    const trimmedName = newPersonName.trim()

    // Validate the name
    const validation = validatePersonName(trimmedName)
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid name")
      return
    }

    // Check for duplicate names (case-insensitive)
    const isDuplicate = state.currentBill.people.some(
      person => person.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (isDuplicate) {
      setValidationError("A person with this name already exists")
      toast({
        title: "Duplicate name",
        description: "A person with this name already exists in the bill",
        variant: "destructive",
      })
      return
    }

    // Clear any existing errors
    setValidationError("")

    try {
      dispatch({
        type: "ADD_PERSON",
        payload: { name: trimmedName, color: "" },
      })
      
      // Get the newly added person ID
      const newPerson = state.currentBill.people.find(p => p.name === trimmedName)
      if (newPerson && onPersonAdded) {
        onPersonAdded(newPerson.id)
      }
      
      // Auto-select the new person
      onSelectionChange([...selectedPeople, newPerson?.id || ""])
      
      // Show success animation
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setNewPersonName("")
        setIsAddingPerson(false)
      }, 500)
    } catch (error) {
      console.error("Failed to add person:", error)
      toast({
        title: "Error",
        description: "Failed to add person. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddPerson()
    } else if (e.key === "Escape") {
      setIsAddingPerson(false)
      setNewPersonName("")
      setValidationError("")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPersonName(e.target.value)
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("")
    }
  }

  const handleTogglePerson = (personId: string) => {
    const newSelection = selectedPeople.includes(personId)
      ? selectedPeople.filter((id) => id !== personId)
      : [...selectedPeople, personId]

    onSelectionChange(newSelection)
  }

  if (state.currentBill.people.length === 0 && !showQuickAdd) {
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
        
        {/* Quick Add Person Button */}
        {showQuickAdd && !isAddingPerson && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingPerson(true)}
            className="h-8 px-3 text-xs border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all duration-200 rainbow-border-hover"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add person
          </Button>
        )}
      </div>

      {/* Inline Add Person Form */}
      {isAddingPerson && (
        <div className="space-y-2 animate-slide-in-down">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Enter name"
              value={newPersonName}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="h-9 text-sm flex-1 rounded-xl border-border/50 focus:border-primary transition-all duration-200"
              autoFocus
              aria-invalid={validationError ? 'true' : 'false'}
              aria-describedby={validationError ? 'person-name-error' : undefined}
            />
            <Button 
              size="sm" 
              onClick={handleAddPerson} 
              disabled={!newPersonName.trim()} 
              className={`h-9 px-4 rounded-xl transition-all duration-200 font-medium ${showSuccess ? 'bg-success hover:bg-success/90 text-success-foreground success-pulse' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
            >
              {showSuccess ? '✓' : 'Add'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingPerson(false)
                setNewPersonName("")
                setValidationError("")
              }}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {validationError && (
            <div
              id="person-name-error"
              className="text-sm text-destructive animate-slide-in-down"
              role="alert"
              aria-live="polite"
            >
              {validationError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
