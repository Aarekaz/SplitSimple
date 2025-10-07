"use client"

import React from "react"
import {
  Users,
  ShoppingCart,
  Receipt,
  DollarSign,
  Coffee,
  Plane,
  Home,
  Calculator,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: "secondary" | "ghost"
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
    <div
      className={cn(
        "surface-card flex flex-col gap-4 rounded-lg border border-border p-8 text-left animate-fade-in-up",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-2 text-foreground animate-scale-in">
          {icon}
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-card-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center gap-3">
          {action ? (
            <Button
              onClick={action.onClick}
              variant={action.variant || "secondary"}
              size="sm"
              className="border border-border bg-surface-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
            >
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size="sm"
              className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

interface QuickStartCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  active?: boolean
  className?: string
}

export function QuickStartCard({
  icon,
  title,
  description,
  onClick,
  active = false,
  className,
}: QuickStartCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "surface-card w-full text-left",
        "rounded-lg border border-border px-4 py-3 transition-all-moderate",
        "hover:border-border-strong hover:bg-surface-3 hover:shadow-md hover:scale-[1.02]",
        "active:scale-[0.98]",
        active && "border-border-strong bg-surface-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-1 text-muted-foreground">
          {icon}
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-card-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  )
}

interface EmptyBillStateProps {
  onAddPerson: () => void
  onAddItem: () => void
}

export function EmptyBillState({ onAddPerson, onAddItem }: EmptyBillStateProps) {
  return (
    <EmptyState
      icon={<Receipt className="h-5 w-5" />}
      title="Ready to split?"
      description="Add people and record the first line item to start balancing this bill."
      action={{
        label: "Add People",
        onClick: onAddPerson,
      }}
      secondaryAction={{
        label: "Add Items",
        onClick: onAddItem,
      }}
    />
  )
}

interface EmptyItemsStateProps {
  onAddItem: () => void
  hasPeople: boolean
}

export function EmptyItemsState({ onAddItem, hasPeople }: EmptyItemsStateProps) {
  if (!hasPeople) {
    return (
      <EmptyState
        icon={<ShoppingCart className="h-5 w-5" />}
        title="Almost there"
        description="Invite at least one person before logging items so we know who to split with."
      />
    )
  }

  return (
    <EmptyState
      icon={<ShoppingCart className="h-5 w-5" />}
      title="No items recorded"
      description="Log each item you need to split. Assign people and we’ll handle the math."
      action={{
        label: "Add First Item",
        onClick: onAddItem,
      }}
    />
  )
}

interface EmptyPeopleStateProps {
  onAddPerson: () => void
}

export function EmptyPeopleState({ onAddPerson }: EmptyPeopleStateProps) {
  return (
    <EmptyState
      icon={<Users className="h-5 w-5" />}
      title="Start with people"
      description="Add the first participant so we can track who owes what."
      action={{
        label: "Add First Person",
        onClick: onAddPerson,
      }}
    />
  )
}

type QuickStartType = "restaurant" | "groceries" | "trip" | "utilities" | "custom"

interface OnboardingFlowProps {
  onQuickStart: (type: QuickStartType) => void
  onAddPerson: () => void
}

const QUICK_START_OPTIONS: Array<{
  key: QuickStartType
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    key: "restaurant",
    label: "Restaurant",
    description: "Divide shared dishes, drinks, and tips.",
    icon: <Coffee className="h-4 w-4" />,
  },
  {
    key: "groceries",
    label: "Groceries",
    description: "Track a shared basket or weekly haul.",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    key: "trip",
    label: "Trip",
    description: "Keep travel costs fair for the group.",
    icon: <Plane className="h-4 w-4" />,
  },
  {
    key: "utilities",
    label: "Utilities",
    description: "Split rent, power, or internet evenly.",
    icon: <Home className="h-4 w-4" />,
  },
  {
    key: "custom",
    label: "Custom",
    description: "Start from a clean slate.",
    icon: <Calculator className="h-4 w-4" />,
  },
]

export function OnboardingFlow({ onQuickStart, onAddPerson }: OnboardingFlowProps) {
  return (
    <section className="surface-card space-y-8 rounded-lg border border-border p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="micro-label text-muted-foreground">Getting started</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
            Invite your first person
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            SplitSimple works best when everyone is in the room. Add a participant, then start logging
            the items you are sharing.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="border border-border bg-surface-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
          onClick={onAddPerson}
        >
          <Users className="mr-2 h-3.5 w-3.5" />
          Add person
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_START_OPTIONS.map((option) => (
          <QuickStartCard
            key={option.key}
            icon={option.icon}
            title={option.label}
            description={option.description}
            onClick={() => onQuickStart(option.key)}
          />
        ))}
      </div>

      <div className="rounded-md border border-border bg-surface-2 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Two quick steps</p>
            <ol className="space-y-2 text-sm text-card-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-muted-foreground">1.</span>
                <span>Add everyone involved in the split.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-muted-foreground">2.</span>
                <span>Log each item, assign people, and let SplitSimple compute totals.</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
