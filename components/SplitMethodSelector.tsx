"use client"

import { Scale, Percent, Calculator, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBillAnalytics } from "@/hooks/use-analytics"

export type SplitMethod = "even" | "shares" | "percent" | "exact"

interface SplitMethodOption {
  value: SplitMethod
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const splitMethodOptions: SplitMethodOption[] = [
  {
    value: "even",
    label: "Even Split",
    description: "Split equally among selected people",
    icon: Users,
  },
  {
    value: "shares",
    label: "By Shares",
    description: "Split based on custom shares",
    icon: Scale,
  },
  {
    value: "percent",
    label: "By Percent",
    description: "Split by percentage amounts",
    icon: Percent,
  },
  {
    value: "exact",
    label: "Exact Amount",
    description: "Specify exact dollar amounts",
    icon: Calculator,
  },
]

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
      <label className="text-xs font-semibold text-muted-foreground">Split Method</label>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/20 p-2">
        {splitMethodOptions.map((option) => {
          const Icon = option.icon
          const isActive = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleMethodChange(option.value)}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all text-xs font-medium",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 border-2 border-primary"
                  : "bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm border-2 border-transparent"
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
