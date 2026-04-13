"use client"

import React from "react"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-16 px-6", className)}>
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
      </div>

      <div className="space-y-2 mb-8">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              size="lg"
              className="min-w-[160px]"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="lg"
              className="min-w-[160px]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface EmptyPeopleStateProps {
  onAddPerson: () => void
}

export function EmptyPeopleState({ onAddPerson }: EmptyPeopleStateProps) {
  return (
    <EmptyState
      icon={<Users className="w-9 h-9 text-primary" />}
      title="Add the first person"
      description="Start by adding everyone who's splitting this bill."
      action={{
        label: "Add person",
        onClick: onAddPerson,
      }}
    />
  )
}
