"use client"

import React, { useState, useEffect } from "react"
import { Check, X, TrendingUp, Users, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface SuccessRippleProps {
  children: React.ReactNode
  trigger?: boolean
  className?: string
}

export function SuccessRipple({ children, trigger, className }: SuccessRippleProps) {
  const [showRipple, setShowRipple] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (trigger && !prefersReducedMotion) {
      setShowRipple(true)
      const timer = setTimeout(() => setShowRipple(false), 240)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [trigger, prefersReducedMotion])

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {showRipple && !prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-green-400/30 via-green-400/10 to-transparent animate-ping" />
        </div>
      )}
      {children}
    </div>
  )
}

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

interface CelebrationOverlayProps {
  show: boolean
  onComplete?: () => void
  message?: string
}

export function CelebrationOverlay({ show, onComplete, message = "Great job!" }: CelebrationOverlayProps) {
  const prefersReducedMotion = useReducedMotion()
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, prefersReducedMotion ? 0 : 300)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [show, onComplete, prefersReducedMotion])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-2xl bill-complete-celebration">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-headline">{message}</h3>
            <p className="text-caption mt-1">Bill is ready to share</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ErrorShakeProps {
  children: React.ReactNode
  trigger?: boolean
  className?: string
}

export function ErrorShake({ children, trigger, className }: ErrorShakeProps) {
  const [shouldShake, setShouldShake] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (trigger && !prefersReducedMotion) {
      setShouldShake(true)
      const timer = setTimeout(() => setShouldShake(false), 250)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [trigger, prefersReducedMotion])

  return (
    <div className={cn(shouldShake && "error-shake", className)}>
      {children}
    </div>
  )
}

interface AnimatedCounterProps {
  value: number
  duration?: number
  formatFn?: (value: number) => string
  className?: string
}

export function AnimatedCounter({ 
  value, 
  duration = 250, 
  formatFn = (v) => v.toString(), 
  className 
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isIncreasing, setIsIncreasing] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (value === displayValue) return

    if (prefersReducedMotion) {
      setDisplayValue(value)
      setIsIncreasing(false)
      return
    }

    const isIncrease = value > displayValue
    setIsIncreasing(isIncrease)

    const startValue = displayValue
    const difference = value - startValue
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (difference * eased)
      
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        setIsIncreasing(false)
      }
    }

    requestAnimationFrame(animate)
  }, [value, displayValue, duration, prefersReducedMotion])

  return (
    <span className={cn(
      "transition-[color,transform] duration-200",
      isIncreasing && "text-green-600 scale-105",
      className
    )} style={{ willChange: 'transform' }}>
      {formatFn(displayValue)}
    </span>
  )
}
