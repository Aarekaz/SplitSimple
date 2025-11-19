"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Search, Loader2 } from "lucide-react"
import { getBillFromCloud } from "@/lib/sharing"
import { useBill } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { migrateBillSchema } from "@/lib/validation"
import { useIsMobile } from "@/hooks/use-mobile"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { cn } from "@/lib/utils"

export function BillLookup() {
  const { dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const isMobile = useIsMobile()
  const [billId, setBillId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateBillId = (id: string): boolean => {
    // Bill ID format: {timestamp}-{randomString}
    // Example: 1763442653885-vlpkbu4
    // Also accept just timestamp for better UX (we'll show helpful error)
    const fullPattern = /^\d{13}-[a-z0-9]+$/i
    const shortPattern = /^#?\d{7,13}$/i  // Accepts with or without # prefix

    return fullPattern.test(id.trim()) || shortPattern.test(id.trim())
  }

  const handleLoadBill = async () => {
    let trimmedId = billId.trim().replace(/^#/, '') // Remove # if present

    if (!trimmedId) {
      setError("Please enter a bill ID")
      toast({
        title: "Enter a bill ID",
        description: "Please enter a valid bill ID to load",
        variant: "destructive",
      })
      return
    }

    // Check if they entered just the short format (numbers only)
    const shortPattern = /^\d{7,13}$/i
    if (shortPattern.test(trimmedId)) {
      setError("Need full bill ID with code (e.g., 1234567890123-abc1234)")
      toast({
        title: "Incomplete bill ID",
        description: "The # number shown in the header is just for reference. You need the full bill ID from the share URL (includes the code after the dash).",
        variant: "destructive",
        duration: 6000,
      })
      return
    }

    // Validate full format
    const fullPattern = /^\d{13}-[a-z0-9]+$/i
    if (!fullPattern.test(trimmedId)) {
      setError("Invalid format. Expected: 1234567890123-abc1234")
      toast({
        title: "Invalid bill ID format",
        description: "Bill ID should be in format: {timestamp}-{code} (e.g., 1763442653885-vlpkbu4)",
        variant: "destructive",
      })
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const result = await getBillFromCloud(trimmedId)

      if (result.bill) {
        // Migration: Add missing fields
        const migratedBill = migrateBillSchema(result.bill)

        dispatch({ type: "LOAD_BILL", payload: migratedBill })
        setBillId("")
        setIsOpen(false)

        toast({
          title: "Bill loaded!",
          description: `"${result.bill.title}" with ${result.bill.people.length} people and ${result.bill.items.length} items`,
        })
        analytics.trackFeatureUsed("footer_load_bill")
      } else {
        const errorMsg = result.error || "The bill ID may be invalid or expired"
        setError(errorMsg)
        toast({
          title: "Bill not found",
          description: errorMsg,
          variant: "destructive",
        })
        analytics.trackError("footer_load_bill_failed", result.error || "Bill not found")
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMsg)
      toast({
        title: "Error loading bill",
        description: errorMsg,
        variant: "destructive",
      })
      analytics.trackError("footer_load_bill_error", errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleLoadBill()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillId(e.target.value)
    if (error) setError(null)
  }

  // Mobile: Sheet/Bottom drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button className="flex items-center gap-1.5 hover:text-foreground transition-colors pointer-events-auto">
            <Search className="h-3 w-3" />
            <span>Load Bill</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Load Bill by ID</SheetTitle>
            <SheetDescription>
              Enter a bill ID to load a shared bill. You can find the bill ID in the share URL.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="1763442653885-vlpkbu4"
                value={billId}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={cn(
                  "font-mono text-sm",
                  error && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Example: If the URL is <code className="px-1 bg-muted rounded text-[10px]">?bill=1763442653885-vlpkbu4</code>,
                enter <code className="px-1 bg-muted rounded text-[10px]">1763442653885-vlpkbu4</code>
              </p>
            </div>
            <Button
              onClick={handleLoadBill}
              disabled={isLoading || !billId.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Load Bill
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Inline input
  return (
    <div className="flex items-center gap-2 pointer-events-auto">
      <div className="flex items-center gap-1.5">
        <Search className="h-3 w-3 text-muted-foreground" />
        <Input
          placeholder="Enter bill ID..."
          value={billId}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-7 w-56 text-xs font-mono bg-background/50 border-border/50 focus:border-primary/50 transition-all",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          disabled={isLoading}
        />
      </div>
      <Button
        onClick={handleLoadBill}
        disabled={isLoading || !billId.trim()}
        size="sm"
        variant="secondary"
        className="h-7 px-3 text-xs"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            Loading
          </>
        ) : (
          "Load"
        )}
      </Button>
    </div>
  )
}
