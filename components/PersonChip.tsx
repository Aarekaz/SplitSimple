"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Person } from "@/contexts/BillContext"

interface PersonChipProps {
  person: Person
  onRemove?: (personId: string) => void
  isSelected?: boolean
  onToggle?: (personId: string) => void
  showRemove?: boolean
  size?: "sm" | "md" | "lg"
}

export function PersonChip({
  person,
  onRemove,
  isSelected,
  onToggle,
  showRemove = true,
  size = "md",
}: PersonChipProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 h-6",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  }

  const buttonSizeClasses = {
    sm: "h-3 w-3 p-0",
    md: "h-4 w-4 p-0",
    lg: "h-5 w-5 p-0",
  }

  const iconSizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  }

  const handleClick = () => {
    if (onToggle) {
      onToggle(person.id)
    }
  }

  return (
    <Badge
      variant={isSelected ? "default" : "secondary"}
      className={`
        ${sizeClasses[size]} 
        flex items-center gap-1.5 cursor-pointer transition-all
        ${onToggle ? "hover:scale-105" : ""}
        ${isSelected ? "ring-2 ring-accent/50" : ""}
        !text-gray-900 font-medium
      `}
      style={{
        backgroundColor: isSelected ? person.color : "#f8f9fa",
        borderColor: person.color,
        color: isSelected ? "white" : "#111827",
      }}
      onClick={handleClick}
    >
      <div
        className={`${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full flex-shrink-0`}
        style={{ backgroundColor: person.color }}
      />
      <span className="font-semibold flex-1 min-w-0" style={{ color: isSelected ? "white" : "#111827" }}>
        {person.name || "Unnamed"}
      </span>
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className={`${buttonSizeClasses[size]} hover:bg-destructive/20 ml-1 flex-shrink-0`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(person.id)
          }}
        >
          <X className={iconSizeClasses[size]} />
          <span className="sr-only">Remove {person.name}</span>
        </Button>
      )}
    </Badge>
  )
}
