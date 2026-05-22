"use client"

import React, { useState, useEffect } from "react"
import { Check, TrendingUp, Users, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface ProgressIndicatorProps {
  total: number
  completed: number
  label?: string
  className?: string
}

export function ProgressIndicator({ total, completed, label, className }: ProgressIndicatorProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimatedPercentage(percentage)
      return undefined
    }
    const timer = setTimeout(() => setAnimatedPercentage(percentage), 50)
    return () => clearTimeout(timer)
  }, [percentage, prefersReducedMotion])

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-caption">{label}</span>
          <span className="font-medium">
            {completed} of {total}
          </span>
        </div>
      )}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-[width,opacity] duration-250 ease-out progress-shine"
          style={{ width: `${animatedPercentage}%` }}
        />
        {percentage === 100 && !prefersReducedMotion && (
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/50 to-emerald-400/50 animate-pulse" />
        )}
      </div>
    </div>
  )
}

interface BillHealthIndicatorProps {
  hasItems: boolean
  hasPeople: boolean
  hasUnassignedItems?: boolean
  className?: string
}

export function BillHealthIndicator({ 
  hasItems, 
  hasPeople, 
  hasUnassignedItems = false, 
  className 
}: BillHealthIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()
  const getHealthStatus = () => {
    if (!hasItems && !hasPeople) return { color: 'text-muted-foreground', message: 'Getting started', icon: Users }
    if (!hasPeople) return { color: 'text-orange-500', message: 'Add people to continue', icon: Users }
    if (!hasItems) return { color: 'text-blue-500', message: 'Ready for items', icon: DollarSign }
    if (hasUnassignedItems) return { color: 'text-yellow-500', message: 'Some items unassigned', icon: TrendingUp }
    return { color: 'text-green-500', message: 'Looking good!', icon: Check }
  }

  const { color, message, icon: Icon } = getHealthStatus()

  return (
    <div className={cn("flex items-center gap-2", color, className)}>
      <div className="relative">
        <div className={cn("w-2 h-2 rounded-full bg-current", !prefersReducedMotion && "animate-pulse")} />
        {color === 'text-green-500' && !prefersReducedMotion && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-current animate-ping" />
        )}
      </div>
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{message}</span>
    </div>
  )
}
