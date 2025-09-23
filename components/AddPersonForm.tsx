"use client"

import React, { useState, forwardRef } from "react"
import { useBill } from "@/contexts/BillContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { validatePersonName } from "@/lib/validation"
import { useToast } from "@/hooks/use-toast"

interface AddPersonFormProps {
  onPersonAdded?: () => void
  onCancel?: () => void
  showButton?: boolean
  showAlignmentDiv?: boolean
}

export const AddPersonForm = forwardRef<HTMLInputElement, AddPersonFormProps>(function AddPersonForm(
  { onPersonAdded, onCancel, showButton = true, showAlignmentDiv = true },
  ref
) {
  const { state, dispatch } = useBill()
  const analytics = useBillAnalytics()
  const { toast } = useToast()
  const [newPersonName, setNewPersonName] = useState("")
  const [validationError, setValidationError] = useState<string>("")

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
      // Track person addition
      analytics.trackPersonAdded("manual")
      setNewPersonName("")
      if (onPersonAdded) {
        onPersonAdded()
      }
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
      if (onCancel) {
        onCancel()
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPersonName(e.target.value)
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("")
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {showAlignmentDiv && <div className="w-3 h-3 flex-shrink-0" />}
        <Input
          ref={ref}
          type="text"
          placeholder="Enter name"
          value={newPersonName}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className={`h-8 text-sm flex-1 ${validationError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          autoFocus
          aria-invalid={validationError ? 'true' : 'false'}
          aria-describedby={validationError ? 'person-name-error' : undefined}
        />
        {showButton && (
          <Button size="sm" onClick={handleAddPerson} disabled={!newPersonName.trim()} className="h-8 px-3">
            Add
          </Button>
        )}
      </div>
      {validationError && (
        <div
          id="person-name-error"
          className="text-sm text-destructive ml-5"
          role="alert"
          aria-live="polite"
        >
          {validationError}
        </div>
      )}
    </div>
  )
})
