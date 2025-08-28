"use client"

import React, { useState } from "react"
import { Plus, X, Users, ShoppingCart, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileActionButtonProps {
  onAddPerson: () => void
  onAddItem: () => void
  onViewReceipt?: () => void
  disabled?: boolean
}

export function MobileActionButton({ 
  onAddPerson, 
  onAddItem, 
  onViewReceipt,
  disabled = false 
}: MobileActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAction = (action: () => void) => {
    action()
    setIsExpanded(false)
  }

  if (disabled) {
    return null
  }

  return (
    <div className="lg:hidden">
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action Menu */}
      <div className="fixed bottom-20 right-6 z-50">
        {isExpanded && (
          <div className="flex flex-col gap-3 mb-4">
            {onViewReceipt && (
              <Button
                size="lg"
                variant="secondary"
                className="h-14 px-6 shadow-lg animate-in slide-in-from-bottom-2 duration-200"
                onClick={() => handleAction(onViewReceipt)}
              >
                <Receipt className="h-5 w-5 mr-3" />
                View Receipt
              </Button>
            )}
            
            <Button
              size="lg"
              variant="secondary"
              className="h-14 px-6 shadow-lg animate-in slide-in-from-bottom-2 duration-200 delay-75"
              onClick={() => handleAction(onAddItem)}
            >
              <ShoppingCart className="h-5 w-5 mr-3" />
              Add Item
            </Button>
            
            <Button
              size="lg"
              variant="secondary"
              className="h-14 px-6 shadow-lg animate-in slide-in-from-bottom-2 duration-200 delay-100"
              onClick={() => handleAction(onAddPerson)}
            >
              <Users className="h-5 w-5 mr-3" />
              Add Person
            </Button>
          </div>
        )}

        {/* Main FAB */}
        <Button
          size="lg"
          className={cn(
            "h-16 w-16 rounded-full shadow-lg",
            "transition-all duration-300",
            isExpanded && "rotate-45 scale-110"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  )
}

// Spacer component to prevent content from being hidden behind the FAB
export function MobileActionSpacer() {
  return <div className="lg:hidden h-24" />
}