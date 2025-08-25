"use client"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { validateCurrencyInput, validatePercentage, validateShares } from "@/lib/validation"
import type { Person, Item } from "@/contexts/BillContext"

interface SplitMethodInputProps {
  item: Item
  people: Person[]
  onCustomSplitsChange: (customSplits: Record<string, number>) => void
}

export function SplitMethodInput({ item, people, onCustomSplitsChange }: SplitMethodInputProps) {
  const [customSplits, setCustomSplits] = useState<Record<string, number>>(item.customSplits || {})
  const [validationError, setValidationError] = useState<string>("")

  const selectedPeople = people.filter((p) => item.splitWith.includes(p.id))

  useEffect(() => {
    setCustomSplits(item.customSplits || {})
  }, [item.customSplits])

  const handleSplitChange = (personId: string, value: string) => {
    let validation
    
    switch (item.method) {
      case 'shares':
        validation = validateShares(value)
        break
      case 'percent':
        validation = validatePercentage(value)
        break
      case 'exact':
        validation = validateCurrencyInput(value)
        break
      default:
        validation = { isValid: true, value: value, error: undefined }
    }
    
    if (validation.isValid) {
      const numValue = Number.parseFloat(validation.value.toString()) || 0
      const newSplits = { ...customSplits, [personId]: numValue }
      setCustomSplits(newSplits)
      onCustomSplitsChange(newSplits)
      validateSplits(newSplits)
    }
  }

  const validateSplits = (splits: Record<string, number>) => {
    const values = selectedPeople.map((p) => splits[p.id] || 0)
    const total = values.reduce((sum, val) => sum + val, 0)

    switch (item.method) {
      case "shares":
        if (total === 0) {
          setValidationError("Total shares must be greater than 0")
        } else {
          setValidationError("")
        }
        break

      case "percent":
        if (Math.abs(total - 100) > 0.01) {
          setValidationError(`Percentages must total 100% (currently ${total.toFixed(1)}%)`)
        } else {
          setValidationError("")
        }
        break

      case "exact":
        const itemPrice = parseFloat(item.price || '0')
        if (Math.abs(total - itemPrice) > 0.01) {
          setValidationError(`Amounts must total $${itemPrice.toFixed(2)} (currently $${total.toFixed(2)})`)
        } else {
          setValidationError("")
        }
        break

      default:
        setValidationError("")
    }
  }

  if (item.method === "even" || selectedPeople.length === 0) {
    return null
  }

  const getInputLabel = () => {
    switch (item.method) {
      case "shares":
        return "Shares"
      case "percent":
        return "Percent (%)"
      case "exact":
        return "Amount ($)"
      default:
        return "Value"
    }
  }

  const getInputStep = () => {
    switch (item.method) {
      case "shares":
        return "1"
      case "percent":
        return "0.1"
      case "exact":
        return "0.01"
      default:
        return "0.01"
    }
  }

  const getInputMode = () => {
    switch (item.method) {
      case "shares":
        return "numeric"
      case "percent":
        return "decimal"
      case "exact":
        return "decimal"
      default:
        return "decimal"
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">{getInputLabel()}</Label>
      <div className="space-y-3">
        {selectedPeople.map((person) => (
          <div key={person.id} className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: person.color }} />
              <span className="text-sm font-medium flex-shrink-0 min-w-0 truncate">{person.name}</span>
            </div>
            <div className="w-24 flex-shrink-0">
              <Input
                type="number"
                step={getInputStep()}
                min="0"
                value={customSplits[person.id] || ""}
                onChange={(e) => handleSplitChange(person.id, e.target.value)}
                className="h-9 text-sm"
                placeholder="0"
                inputMode={getInputMode()}
              />
            </div>
          </div>
        ))}
      </div>
      {validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
