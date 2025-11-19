"use client"

import { useEffect, useState, memo } from "react"
import { formatNumber } from "@/lib/utils"

interface AnimatedNumberProps {
  value: number
  className?: string
  formatFn?: (value: number) => string
  duration?: number
  prefix?: string
  suffix?: string
}

export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  className = "",
  formatFn = formatNumber, // Use smart number formatting by default
  duration = 300,
  prefix = "",
  suffix = ""
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const [shouldPulse, setShouldPulse] = useState(false)

  useEffect(() => {
    if (value === displayValue) return

    const difference = Math.abs(value - displayValue)
    const percentChange = displayValue !== 0 ? (difference / Math.abs(displayValue)) : Infinity

    // Skip animation for very large changes (e.g., typing corrections like 200 → 2)
    // If change is more than 50% or difference is very large, update instantly
    if (percentChange > 0.5 || difference > 100) {
      setDisplayValue(value)
      // Still trigger pulse for visual feedback
      setShouldPulse(true)
      setTimeout(() => setShouldPulse(false), 600)
      return
    }

    setIsAnimating(true)
    const startValue = displayValue
    const startTime = Date.now()

    // Trigger pulse for significant changes
    if (Math.abs(difference) > Math.abs(startValue) * 0.1) {
      setShouldPulse(true)
      setTimeout(() => setShouldPulse(false), 600)
    }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Enhanced easing with spring-like feel
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      const currentValue = startValue + ((value - startValue) * eased)

      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [value, displayValue, duration])

  return (
    <span
      className={`${className} ${isAnimating ? 'transition-all duration-300' : ''} ${shouldPulse ? 'success-pulse' : ''} currency-display`}
      style={{
        fontFeatureSettings: '"tnum" 1, "zero" 1', // Enhanced font features
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {prefix}{formatFn(displayValue)}{suffix}
    </span>
  )
})
