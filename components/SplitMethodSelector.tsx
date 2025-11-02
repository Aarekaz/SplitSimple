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
      <div className="flex flex-wrap gap-1.5">
        {splitMethodOptions.map((option) => {
          const Icon = option.icon
          const isActive = value === option.value
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleMethodChange(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                "rainbow-border-hover",
                isActive
                  ? "bg-primary shadow-sm"
                  : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              )}
              title={option.description}
            >
              <span className={cn("flex-shrink-0", isActive && "text-primary-foreground")}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className={cn("flex-shrink-0", isActive && "text-primary-foreground")}>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
