"use client"

import React from "react"
import { Plus, Users, ShoppingCart, Receipt, DollarSign, Calculator, Coffee, Plane, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-16 px-6", className)}>
      <div className="relative mb-8">
        <div className="w-28 h-28 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center relative overflow-hidden shadow-lg">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
          <div className="relative z-10">
            {icon}
          </div>
        </div>
        
        {/* Floating elements for visual interest */}
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center animate-bounce delay-100 shadow-md">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-lg animate-pulse delay-300 shadow-md" />
      </div>
      
      <div className="space-y-3 mb-8">
        <h3 className="text-headline">{title}</h3>
        <p className="text-subtitle max-w-sm mx-auto">
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
              className="gap-2 min-w-[160px] h-12 rounded-xl btn-float bg-gradient-to-br from-primary to-primary/90 hover:from-primary-600 hover:to-primary/80 text-white font-medium"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick} 
              variant="outline"
              size="lg"
              className="gap-2 min-w-[160px] h-12 rounded-xl border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all duration-200 font-medium"
            >
              {secondaryAction.label}
            </Button>
          )}
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
  variant?: "default" | "primary"
  className?: string
}

export function QuickStartCard({ 
  icon, 
  title, 
  description, 
  onClick, 
  variant = "default",
  className 
}: QuickStartCardProps) {
  const isPrimary = variant === "primary"
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 float-card-sm border-0 hover:shadow-md group",
        isPrimary && "bg-gradient-to-br from-primary/5 to-primary/0",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-xl transition-all duration-200 flex-shrink-0",
            isPrimary 
              ? "bg-gradient-to-br from-primary to-primary/90 text-white shadow-md group-hover:shadow-lg" 
              : "bg-gradient-to-br from-muted to-muted/50 group-hover:from-muted/80 group-hover:to-muted/30"
          )}>
            {icon}
          </div>
          <div className="flex-1 space-y-1.5">
            <h4 className="font-semibold text-base">{title}</h4>
            <p className="text-caption text-left leading-relaxed">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Specific empty state components
interface EmptyBillStateProps {
  onAddPerson: () => void
  onAddItem: () => void
}

export function EmptyBillState({ onAddPerson, onAddItem }: EmptyBillStateProps) {
  return (
    <EmptyState
      icon={<Receipt className="w-10 h-10 text-primary" />}
      title="Ready to split?"
      description="Add some people and items to get started with your bill splitting"
      action={{
        label: "Add People",
        onClick: onAddPerson
      }}
      secondaryAction={{
        label: "Add Items",
        onClick: onAddItem
      }}
    />
  )
}

interface EmptyItemsStateProps {
  onAddItem: () => void
  hasPeople: boolean
}

export function EmptyItemsState({ onAddItem, hasPeople }: EmptyItemsStateProps) {
  return (
    <EmptyState
      icon={<ShoppingCart className="w-10 h-10 text-blue-600" />}
      title={hasPeople ? "Ready to add items?" : "Almost there!"}
      description={
        hasPeople 
          ? "Add items from your receipt and we'll automatically split them among your group"
          : "Add people first, then you can start adding items to split the costs fairly"
      }
      action={hasPeople ? {
        label: "Add First Item",
        onClick: onAddItem
      } : undefined}
    />
  )
}

interface EmptyPeopleStateProps {
  onAddPerson: () => void
}

export function EmptyPeopleState({ onAddPerson }: EmptyPeopleStateProps) {
  return (
    <EmptyState
      icon={<Users className="w-10 h-10 text-purple-600" />}
      title="Let's get started!"
      description="Add the first person to your group and we'll help you split costs fairly"
      action={{
        label: "Add First Person",
        onClick: onAddPerson
      }}
    />
  )
}

// Onboarding flow with quick start options
interface OnboardingFlowProps {
  onQuickStart: (type: "restaurant" | "groceries" | "trip" | "utilities" | "custom") => void
  onAddPerson: () => void
}

export function OnboardingFlow({ onQuickStart, onAddPerson }: OnboardingFlowProps) {
  return (
    <div className="p-6 space-y-10 max-w-2xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-5">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center mb-4 relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <Receipt className="w-11 h-11 text-white relative z-10" />
          </div>
          {/* Floating decorations */}
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-success to-success/80 rounded-xl flex items-center justify-center animate-bounce shadow-md">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gradient-to-br from-secondary to-secondary/80 rounded-lg animate-pulse delay-500 shadow-md" />
        </div>
        
        <div>
          <h1 className="text-display mb-3">Split the Bill</h1>
          <p className="text-subtitle">
            Divide expenses fairly, track who owes what, and settle up effortlessly
          </p>
        </div>
      </div>

      {/* Quick Start Options */}
      <div className="space-y-4">
        <h2 className="text-title text-center mb-6">Quick Start</h2>
        
        <div className="grid gap-3">
          <QuickStartCard
            icon={<Coffee className="w-6 h-6" />}
            title="Restaurant Bill"
            description="Perfect for dining out with friends"
            onClick={() => onQuickStart("restaurant")}
            variant="primary"
          />
          
          <QuickStartCard
            icon={<ShoppingCart className="w-6 h-6" />}
            title="Groceries & Shopping"
            description="Split household or group shopping expenses"
            onClick={() => onQuickStart("groceries")}
          />
          
          <QuickStartCard
            icon={<Plane className="w-6 h-6" />}
            title="Trip Expenses"
            description="Track shared costs for group travel"
            onClick={() => onQuickStart("trip")}
          />
          
          <QuickStartCard
            icon={<Home className="w-6 h-6" />}
            title="Utilities & Rent"
            description="Split recurring household bills"
            onClick={() => onQuickStart("utilities")}
          />
          
          <QuickStartCard
            icon={<Calculator className="w-6 h-6" />}
            title="Custom Split"
            description="Manually configure your bill splitting"
            onClick={() => onQuickStart("custom")}
          />
        </div>
      </div>

      {/* Direct Action */}
      <div className="pt-4 border-t border-border/50">
        <Button 
          size="lg" 
          className="w-full h-14 text-lg gap-3 rounded-xl btn-float bg-gradient-to-br from-primary to-primary/90 hover:from-primary-600 hover:to-primary/80 text-white font-semibold"
          onClick={onAddPerson}
        >
          <Plus className="w-5 h-5" />
          Start with First Person
        </Button>
      </div>
    </div>
  )
}

// Loading skeleton for empty states
export function EmptyStateLoading() {
  return (
    <div className="text-center py-12 px-6 animate-pulse">
      <div className="w-24 h-24 mx-auto bg-muted rounded-2xl mb-6" />
      <div className="space-y-3 mb-8">
        <div className="h-8 bg-muted rounded w-48 mx-auto" />
        <div className="h-4 bg-muted rounded w-64 mx-auto" />
      </div>
      <div className="flex gap-3 justify-center">
        <div className="h-10 bg-muted rounded w-32" />
        <div className="h-10 bg-muted rounded w-32" />
      </div>
    </div>
  )
}
