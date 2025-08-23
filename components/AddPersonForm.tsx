"use client"

import React, { useState, forwardRef } from "react"
import { useBill } from "@/contexts/BillContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
  const { dispatch } = useBill()
  const [newPersonName, setNewPersonName] = useState("")

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      dispatch({
        type: "ADD_PERSON",
        payload: { name: newPersonName.trim(), color: "" },
      })
      setNewPersonName("")
      if (onPersonAdded) {
        onPersonAdded()
      }
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

  return (
    <div className="flex items-center gap-2">
      {showAlignmentDiv && <div className="w-3 h-3 flex-shrink-0" />}
      <Input
        ref={ref}
        type="text"
        placeholder="Enter name"
        value={newPersonName}
        onChange={(e) => setNewPersonName(e.target.value)}
        onKeyDown={handleKeyPress}
        className="h-8 text-sm flex-1"
        autoFocus
      />
      {showButton && (
        <Button size="sm" onClick={handleAddPerson} disabled={!newPersonName.trim()} className="h-8 px-3">
          Add
        </Button>
      )}
    </div>
  )
})
