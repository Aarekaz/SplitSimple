"use client"

import { useBill } from "@/contexts/BillContext"
import type { SyncStatus } from "@/contexts/BillContext"
import { Cloud, CloudOff, RotateCw, Check, AlertCircle, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SyncStatusIndicatorProps {
  compact?: boolean
  className?: string
}

const syncStatusConfig: Record<SyncStatus, {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  color: string
  bgColor: string
  animate?: boolean
}> = {
  never_synced: {
    icon: CloudOff,
    label: "Not synced",
    description: "Changes haven't been saved to cloud yet",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
  },
  syncing: {
    icon: RotateCw,
    label: "Syncing...",
    description: "Saving changes to cloud",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    animate: true,
  },
  synced: {
    icon: Check,
    label: "Synced",
    description: "All changes saved to cloud",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  error: {
    icon: AlertCircle,
    label: "Sync failed",
    description: "Failed to save to cloud. Click to retry.",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/30",
  },
}

export function SyncStatusIndicator({ compact = false, className }: SyncStatusIndicatorProps) {
  const { state, syncToCloud } = useBill()
  const config = syncStatusConfig[state.syncStatus]
  const Icon = config.icon

  const handleRetrySync = () => {
    if (state.syncStatus === "error") {
      syncToCloud()
    }
  }

  const formatLastSyncTime = () => {
    if (!state.lastSyncTime) return ""
    const now = Date.now()
    const diff = now - state.lastSyncTime
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (compact) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted/50",
                config.color,
                className
              )}
              onClick={handleRetrySync}
              disabled={state.syncStatus === "syncing"}
            >
              <Icon 
                className={cn(
                  "h-4 w-4",
                  config.animate && "animate-spin"
                )} 
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">{config.label}</div>
              <div className="text-xs text-muted-foreground">{config.description}</div>
              {state.lastSyncTime && state.syncStatus === "synced" && (
                <div className="text-xs text-muted-foreground mt-1">
                  Last synced {formatLastSyncTime()}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          config.color,
          config.bgColor,
          state.syncStatus === "error" && "cursor-pointer hover:opacity-80"
        )}
        onClick={state.syncStatus === "error" ? handleRetrySync : undefined}
      >
        <Icon 
          className={cn(
            "h-3.5 w-3.5",
            config.animate && "animate-spin"
          )} 
        />
        <span>{config.label}</span>
        {state.syncStatus === "error" && (
          <span className="text-xs opacity-60">(click to retry)</span>
        )}
      </div>
      
      {state.lastSyncTime && state.syncStatus === "synced" && (
        <span className="text-xs text-muted-foreground">
          {formatLastSyncTime()}
        </span>
      )}
    </div>
  )
}
