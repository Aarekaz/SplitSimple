"use client"

import { useEffect, useState } from "react"

interface AnimatedNumberProps {
  value: number
  className?: string
  formatFn?: (value: number) => string
  duration?: number
}

export function AnimatedNumber({ 
  value, 
  className = "", 
  formatFn = (v) => v.toFixed(2), 
  duration = 200 
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value === displayValue) return

    setIsAnimating(true)
    const startValue = displayValue
    const difference = value - startValue
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease-out animation
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (difference * eased)
      
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
      className={`${className} ${isAnimating ? 'transition-all' : ''}`}
      style={{ 
        fontFeatureSettings: '"tnum"', // Tabular numbers for consistent width
      }}
    >
      {formatFn(displayValue)}
    </span>
  )
}
