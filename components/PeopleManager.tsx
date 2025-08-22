"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { PersonChip } from "./PersonChip"
import { useBill } from "@/contexts/BillContext"

export function PeopleManager() {
  const { state, dispatch } = useBill()
  const [newPersonName, setNewPersonName] = useState("")
  const [isAddingPerson, setIsAddingPerson] = useState(false)

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      dispatch({
        type: "ADD_PERSON",
        payload: { name: newPersonName.trim(), color: "" }, // Color will be auto-assigned
      })
      setNewPersonName("")
      setIsAddingPerson(false)
    }
  }

  const handleRemovePerson = (personId: string) => {
    dispatch({ type: "REMOVE_PERSON", payload: personId })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddPerson()
    } else if (e.key === "Escape") {
      setIsAddingPerson(false)
      setNewPersonName("")
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">People ({state.currentBill.people.length})</h2>
          </div>
          {!isAddingPerson && (
            <Button variant="outline" size="sm" onClick={() => setIsAddingPerson(true)} className="h-9 px-3 text-sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Person
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Existing people chips */}
          {state.currentBill.people.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.currentBill.people.map((person) => (
                <PersonChip key={person.id} person={person} onRemove={handleRemovePerson} showRemove={true} />
              ))}
            </div>
          )}

          {isAddingPerson && (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Enter name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={() => {
                  if (!newPersonName.trim()) {
                    setIsAddingPerson(false)
                  }
                }}
                className="flex-1 h-9"
                autoFocus
              />
              <Button size="sm" onClick={handleAddPerson} disabled={!newPersonName.trim()} className="h-9 px-3">
                Add
              </Button>
            </div>
          )}

          {state.currentBill.people.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 font-medium mb-1">No people added yet</p>
              <p className="text-sm text-gray-500">Add people to start splitting expenses</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
