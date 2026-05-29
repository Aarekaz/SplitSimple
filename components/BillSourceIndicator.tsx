"use client"

import { Copy, Link2 } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { cn } from "@/lib/utils"

const billSourceConfig = {
  shared: {
    icon: Link2,
    label: "Viewing shared bill",
    className: "text-sky-700 bg-sky-50",
  },
  shared_copy: {
    icon: Copy,
    label: "Editing local copy",
    className: "text-amber-700 bg-amber-50",
  },
} as const

export function BillSourceIndicator({ className }: { className?: string }) {
  const { state } = useBill()

  if (state.billSource === "draft") {
    return null
  }

  const config = billSourceConfig[state.billSource]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </span>
  )
}
