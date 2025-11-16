"use client"

import { cn } from "@/lib/utils"

interface ThermalLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ThermalLogo({ className, size = "md" }: ThermalLogoProps) {
  const sizeClasses = {
    sm: "text-[6px] leading-[0.8]",
    md: "text-[8px] leading-[0.85]",
    lg: "text-[10px] leading-[0.9]"
  }

  return (
    <pre className={cn("thermal-ascii-logo", sizeClasses[size], className)}>
{`▄▄▄ ▄▄▄ ▄   ▄ ▄▄▄ ▄▄▄ ▄
▀▄▀ █▄▄ █   █  █  █▄   █▄
█ █ █   █▄▄ █  █  █    █`}
    </pre>
  )
}
