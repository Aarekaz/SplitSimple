"use client"

import { cn } from "@/lib/utils"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { splitMethodOptions, type SplitMethod } from "@/components/split-method-options"

interface SplitMethodSelectorProps {
  value: SplitMethod
  onValueChange: (value: SplitMethod) => void
  className?: string
  itemId?: string
  peopleCount?: number
  assignedPeopleCount?: number
}

export function SplitMethodSelector({ 
  value, 
  onValueChange, 
  className,
  itemId,
  peopleCount = 0,
  assignedPeopleCount = 0
}: SplitMethodSelectorProps) {
  const analytics = useBillAnalytics()

  const handleMethodChange = (newMethod: SplitMethod) => {
    const oldMethod = value
    onValueChange(newMethod)
    
    // Track split method changes for popularity analytics
    if (itemId && newMethod !== oldMethod) {
      analytics.trackSplitMethodChanged(itemId, oldMethod, newMethod, assignedPeopleCount)
    }
    
    // Track feature usage
    analytics.trackFeatureUsed("split_method_selector", {
      old_method: oldMethod,
      new_method: newMethod,
      people_count: peopleCount,
      assigned_people_count: assignedPeopleCount,
    })
  }
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-medium text-muted-foreground">Split Method</label>
      <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/20 p-1">
        {splitMethodOptions.map((option) => {
          const Icon = option.icon
          const isActive = value === option.value
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleMethodChange(option.value)}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-3 rounded-md transition-[background-color,color,box-shadow] text-xs font-medium",
                "hover:bg-background hover:shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                isActive
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={option.description}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
