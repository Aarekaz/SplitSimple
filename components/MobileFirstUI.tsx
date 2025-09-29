"use client"

import React, { useState, useRef, useEffect } from "react"
import { Plus, Users, Calculator, Receipt, UserPlus, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useBill } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { validatePersonName } from "@/lib/validation"
import { OnboardingFlow } from "@/components/EmptyStates"
import { SuccessRipple } from "@/components/ui/visual-feedback"
import { cn } from "@/lib/utils"

interface QuickStartCardProps {
  icon: React.ReactNode
  title: string
  description: string
  action: () => void
  variant?: "default" | "primary"
}

function QuickStartCard({ icon, title, description, action, variant = "default" }: QuickStartCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-95",
        variant === "primary" && "border-primary bg-primary/5 hover:bg-primary/10"
      )}
      onClick={action}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-full",
            variant === "primary" ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MobilePersonFormProps {
  onSuccess: () => void
  autoFocus?: boolean
}

function MobilePersonForm({ onSuccess, autoFocus = false }: MobilePersonFormProps) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [autoFocus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validatePersonName(name)
    if (!validation.isValid) {
      toast({
        title: "Invalid name",
        description: validation.error,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      dispatch({
        type: "ADD_PERSON",
        payload: { name: validation.value as string, color: "" },
      })
      
      analytics.trackPersonAdded("manual")
      
      toast({
        title: "Person added!",
        description: `${validation.value} has been added to the bill`,
      })
      
      setName("")
      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add person. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="person-name" className="text-sm font-medium">
          Person's name
        </label>
        <Input
          ref={inputRef}
          id="person-name"
          type="text"
          placeholder="Enter name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 text-lg"
          disabled={isSubmitting}
        />
      </div>
      <Button 
        type="submit" 
        size="lg" 
        className="w-full h-12"
        disabled={!name.trim() || isSubmitting}
      >
        <UserPlus className="h-5 w-5 mr-2" />
        {isSubmitting ? "Adding..." : "Add Person"}
      </Button>
    </form>
  )
}

export function MobileFirstUI() {
  const { state } = useBill()
  const [showPersonForm, setShowPersonForm] = useState(false)
  const analytics = useBillAnalytics()

  const hasPeople = state.currentBill.people.length > 0
  const hasItems = state.currentBill.items.length > 0

  const handleQuickStart = (type: "restaurant" | "groceries" | "trip" | "utilities" | "custom") => {
    analytics.trackFeatureUsed(`quick_start_${type}`)
    
    // All quick start options lead to adding the first person
    setShowPersonForm(true)
  }

  if (showPersonForm) {
    return (
      <div className="p-6 space-y-8 max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl flex items-center justify-center mb-4 surface-elevated">
              <UserPlus className="w-9 h-9 text-primary" />
            </div>
            {/* Success indicator */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-headline mb-2">Add First Person</h2>
            <p className="text-subtitle">
              Who's splitting this bill with you?
            </p>
          </div>
        </div>
        
        <SuccessRipple>
          <MobilePersonForm 
            onSuccess={() => setShowPersonForm(false)}
            autoFocus={true}
          />
        </SuccessRipple>
        
        <Button 
          variant="ghost" 
          size="lg" 
          className="w-full smooth-hover"
          onClick={() => setShowPersonForm(false)}
        >
          Back to Quick Start
        </Button>
      </div>
    )
  }

  if (!hasPeople) {
    return (
      <SuccessRipple trigger={showPersonForm}>
        <OnboardingFlow
          onQuickStart={handleQuickStart}
          onAddPerson={() => setShowPersonForm(true)}
        />
      </SuccessRipple>
    )
  }

  // If we have people, show the regular interface
  return null
}