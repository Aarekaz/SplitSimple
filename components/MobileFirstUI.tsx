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

  const handleQuickStart = (type: "dinner" | "trip" | "manual") => {
    analytics.trackFeatureUsed(`quick_start_${type}`)
    
    switch (type) {
      case "dinner":
        setShowPersonForm(true)
        break
      case "trip":
        setShowPersonForm(true)
        break
      case "manual":
        setShowPersonForm(true)
        break
    }
  }

  if (showPersonForm) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Add First Person</h2>
          <p className="text-muted-foreground">
            Who's splitting this bill with you?
          </p>
        </div>
        
        <MobilePersonForm 
          onSuccess={() => setShowPersonForm(false)}
          autoFocus={true}
        />
        
        <Button 
          variant="ghost" 
          size="lg" 
          className="w-full"
          onClick={() => setShowPersonForm(false)}
        >
          Back
        </Button>
      </div>
    )
  }

  if (!hasPeople) {
    return (
      <div className="p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-full mb-4">
            <Receipt className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Split the Bill</h1>
            <p className="text-lg text-muted-foreground">
              Share expenses fairly with friends and family
            </p>
          </div>
        </div>

        {/* Quick Start Options */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Start</h2>
          
          <QuickStartCard
            icon={<DollarSign className="h-6 w-6" />}
            title="Split Restaurant Bill"
            description="Add people and divide the check"
            action={() => handleQuickStart("dinner")}
            variant="primary"
          />
          
          <QuickStartCard
            icon={<Users className="h-6 w-6" />}
            title="Trip Expenses"
            description="Track shared costs for group trips"
            action={() => handleQuickStart("trip")}
          />
          
          <QuickStartCard
            icon={<Calculator className="h-6 w-6" />}
            title="Custom Split"
            description="Manually add people and items"
            action={() => handleQuickStart("manual")}
          />
        </div>

        {/* Direct Action Button */}
        <div className="pt-4">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg"
            onClick={() => setShowPersonForm(true)}
          >
            <Plus className="h-6 w-6 mr-3" />
            Add First Person
          </Button>
        </div>
      </div>
    )
  }

  // If we have people, show the regular interface
  return null
}