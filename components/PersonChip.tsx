"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Person } from "@/contexts/BillContext"
import { cn } from "@/lib/utils"

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

  const baseClasses = "flex items-center gap-1.5 cursor-pointer transition-all border"
  const selectedClasses = "bg-primary text-primary-foreground hover:bg-primary/90"
  const unselectedClasses = "bg-muted hover:bg-muted/80 text-muted-foreground border-dashed"

  return (
    <div
      onClick={handleClick}
      className={cn(
        baseClasses,
        sizeClasses[size],
        isSelected ? selectedClasses : unselectedClasses,
        "rounded-full font-medium"
      )}
    >
      <div
        className={cn("w-2 h-2 rounded-full flex-shrink-0", isSelected ? 'bg-primary-foreground/80' : 'bg-primary/80')}
        style={{ backgroundColor: person.color }}
      />
      <span className="font-medium flex-1 min-w-0">{person.name || "Unnamed"}</span>
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            buttonSizeClasses[size],
            "hover:bg-destructive/20 ml-1 flex-shrink-0 rounded-full"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(person.id)
          }}
        >
          <X className={iconSizeClasses[size]} />
          <span className="sr-only">Remove {person.name}</span>
        </Button>
      )}
    </div>
  )
}
