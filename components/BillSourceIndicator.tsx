"use client"

import { Copy, Link2, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useBill } from "@/contexts/BillContext"
import { Button } from "@/components/ui/button"
import { buildSharedBillPath } from "@/lib/sharing"
import { cn } from "@/lib/utils"

const billSourceConfig = {
  shared: {
    icon: Link2,
    label: "Viewing shared bill",
    className: "text-sky-700 bg-sky-50",
  },
  shared_copy: {
    icon: Copy,
    label: "Forked from shared bill",
    className: "text-amber-700 bg-amber-50",
  },
} as const

export function BillSourceIndicator({ className }: { className?: string }) {
  const { state } = useBill()
  const router = useRouter()

  if (state.billSource === "draft") {
    return null
  }

  const config = billSourceConfig[state.billSource]
  const Icon = config.icon
  const originalSharedBillId = state.billSource === "shared_copy" ? state.sharedOriginBillId : null
  const canReloadOriginal = Boolean(originalSharedBillId)

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
          config.className
        )}
      >
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </span>

      {canReloadOriginal && originalSharedBillId && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 rounded-full px-2 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onClick={() => router.push(buildSharedBillPath(originalSharedBillId), { scroll: false })}
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reload original
        </Button>
      )}
    </span>
  )
}
