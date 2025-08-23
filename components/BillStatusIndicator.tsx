"use client"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBill } from "@/contexts/BillContext"
import { Clock, CheckCircle, XCircle } from "lucide-react"

const statusConfig = {
  draft: {
    label: "Draft",
    icon: Clock,
    variant: "secondary" as const,
    color: "#64748b",
    description: "Bill is still being edited"
  },
  active: {
    label: "Active", 
    icon: CheckCircle,
    variant: "default" as const,
    color: "#16a34a",
    description: "Bill is finalized and active"
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    variant: "outline" as const,
    color: "#dc2626", 
    description: "Bill is closed and completed"
  }
}

interface BillStatusIndicatorProps {
  compact?: boolean
  showSelector?: boolean
}

export function BillStatusIndicator({ compact = false, showSelector = true }: BillStatusIndicatorProps) {
  const { state, dispatch } = useBill()
  const currentStatus = state.currentBill.status
  const config = statusConfig[currentStatus]
  const Icon = config.icon

  const handleStatusChange = (newStatus: "draft" | "active" | "closed") => {
    dispatch({ type: "SET_BILL_STATUS", payload: newStatus })
  }

  if (compact) {
    return (
      <Badge variant={config.variant} className="flex items-center gap-1.5 text-xs px-2 py-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (!showSelector) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={config.variant} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {config.label}
        </Badge>
        <span className="text-muted-foreground text-xs">{config.description}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentStatus} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-auto h-8 border-none shadow-none p-0 gap-1.5 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
          <SelectValue asChild>
            <Badge variant={config.variant} className="flex items-center gap-1.5 cursor-pointer">
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-40">
          {Object.entries(statusConfig).map(([status, statusConfig]) => {
            const StatusIcon = statusConfig.icon
            return (
              <SelectItem key={status} value={status} className="flex items-center gap-2 cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  <StatusIcon className="h-4 w-4" style={{ color: statusConfig.color }} />
                  <div className="flex flex-col">
                    <span className="font-medium">{statusConfig.label}</span>
                    <span className="text-xs text-muted-foreground">{statusConfig.description}</span>
                  </div>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
