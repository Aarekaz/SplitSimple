"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/utils"

interface AnimatedCurrencyProps {
  value: number
  className?: string
  duration?: number
  highlightChanges?: boolean
  showIndicator?: boolean
}

export function AnimatedCurrency({ 
  value, 
  className = "", 
  duration = 300,
  highlightChanges = false,
  showIndicator = false
}: AnimatedCurrencyProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const [changeDirection, setChangeDirection] = useState<'up' | 'down' | null>(null)
  const [showChange, setShowChange] = useState(false)

  useEffect(() => {
    if (value === displayValue) return

    setIsAnimating(true)
    const startValue = displayValue
    const difference = value - startValue
    const startTime = Date.now()
    
    // Track change direction for color indication
    if (difference > 0) {
      setChangeDirection('up')
      if (highlightChanges) {
        setShowChange(true)
        setTimeout(() => setShowChange(false), 1200)
      }
    } else if (difference < 0) {
      setChangeDirection('down')
      if (highlightChanges) {
        setShowChange(true)
        setTimeout(() => setShowChange(false), 1200)
      }
    }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Smooth decelerate easing
      const eased = 1 - Math.pow(1 - progress, 3)
      
      const currentValue = startValue + (difference * eased)
      
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        setIsAnimating(false)
        if (!highlightChanges) {
          setTimeout(() => setChangeDirection(null), 400)
        }
      }
    }

    requestAnimationFrame(animate)
  }, [value, displayValue, duration, highlightChanges])

  const getColorClass = () => {
    if (!showChange || !changeDirection) return ''
    return changeDirection === 'up' ? 'text-success' : 'text-destructive'
  }

  return (
    <span 
      className={`${className} inline-flex items-center gap-1.5 font-mono transition-colors-moderate ${getColorClass()}`}
      style={{ 
        fontFeatureSettings: '"tnum" 1, "zero" 1',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {formatCurrency(displayValue)}
      {showIndicator && changeDirection && showChange && (
        <span className={`text-xs font-bold animate-slide-in-up ${changeDirection === 'up' ? 'text-success' : 'text-destructive'}`}>
          {changeDirection === 'up' ? '↑' : '↓'}
        </span>
      )}
    </span>
  )
}

