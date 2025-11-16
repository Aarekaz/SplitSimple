"use client"

import type React from "react"

import { CollapsibleItemsTable } from "@/components/CollapsibleItemsTable"
import { TotalsPanel } from "@/components/TotalsPanel"
import { MobileTotalsBar } from "@/components/MobileTotalsBar"
import { MobileFirstUI } from "@/components/MobileFirstUI"
import { MobileActionButton, MobileActionSpacer } from "@/components/MobileActionButton"
import { ShareBill } from "@/components/ShareBill"
import { ThermalLogo } from "@/components/ThermalLogo"
import { MobileTabs } from "@/components/MobileTabs"
import { MobileStickyBar } from "@/components/MobileStickyBar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Receipt, Plus, Copy, Share2 } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"
import { generateSummaryText, copyToClipboard } from "@/lib/export"
import { getBillSummary } from "@/lib/calculations"
import { useState, useEffect, useRef } from "react"
import { useBillAnalytics } from "@/hooks/use-analytics"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import { BillStatusIndicator } from "@/components/BillStatusIndicator"
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator"
import { Users } from "lucide-react"

export default function HomePage() {
  const { state, dispatch } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const personInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [previousTitle, setPreviousTitle] = useState(state.currentBill.title)
  const [activeTab, setActiveTab] = useState<"items" | "people" | "total">("items")
  const summary = getBillSummary(state.currentBill)

  const isNewBillFlow =
    isInitialLoad && state.currentBill.title === "New Bill" && state.currentBill.people.length === 0

  useEffect(() => {
    if (isNewBillFlow) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
      setIsInitialLoad(false)
    }
  }, [isNewBillFlow])

  useEffect(() => {
    if (isAddingPerson) {
      setTimeout(() => personInputRef.current?.focus(), 0)
    }
  }, [isAddingPerson])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    dispatch({ type: "SET_BILL_TITLE", payload: newTitle })
    
    if (newTitle !== previousTitle) {
      setPreviousTitle(newTitle)
    }
  }

  useEffect(() => {
    if (previousTitle !== state.currentBill.title && previousTitle !== "New Bill") {
      const timeoutId = setTimeout(() => {
        analytics.trackTitleChanged(state.currentBill.title)
      }, 1000)
      
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [state.currentBill.title, previousTitle, analytics])

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      setIsAddingPerson(true)
    }
  }

  const handleNewBill = () => {
    dispatch({ type: "NEW_BILL" })
    analytics.trackBillCreated()
    analytics.trackFeatureUsed("new_bill")
  }

  const handleCopySummary = async () => {
    if (state.currentBill.people.length === 0) {
      toast({
        title: "No data to copy",
        description: "Add people and items to generate a summary",
        variant: "destructive",
      })
      analytics.trackError("copy_summary_failed", "No data to copy")
      return
    }

    const summaryText = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(summaryText)

    if (success) {
      toast({
        title: "Summary copied!",
        description: "Bill summary has been copied to your clipboard",
      })
      analytics.trackBillSummaryCopied()
      analytics.trackFeatureUsed("copy_summary")
    } else {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      })
      analytics.trackError("copy_summary_failed", "Clipboard API failed")
    }
  }

  const handleAddPerson = () => {
    setIsAddingPerson(true)
    analytics.trackFeatureUsed("mobile_add_person")
  }

  const handleAddItem = () => {
    analytics.trackFeatureUsed("mobile_add_item")
  }

  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  const handleShare = () => {
    setShareDialogOpen(true)
    analytics.trackFeatureUsed("mobile_share_button")
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Thermal Receipt Header */}
      <header className="glass-header px-4 py-2 sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            {/* Left: ASCII Logo & Title */}
            <div className="flex items-center gap-3">
              <ThermalLogo size="sm" className="hidden sm:block" />
              <div className="w-px h-6 bg-border/30 hidden sm:block" />
              <Input
                ref={titleInputRef}
                value={state.currentBill.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled Bill"
                className="h-9 w-36 sm:w-48 border-0 bg-muted/30 text-foreground px-3 rounded-lg hover:bg-muted/50 focus:bg-card focus:shadow-sm transition-all duration-200 font-semibold text-sm"
              />
            </div>

            {/* Right: Status badges */}
            <div className="flex items-center gap-2">
              <BillStatusIndicator compact={true} showSelector={false} />
              <SyncStatusIndicator compact />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Tabs */}
      {isMobile && state.currentBill.people.length > 0 && (
        <MobileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          itemCount={state.currentBill.items.length}
          peopleCount={state.currentBill.people.length}
        />
      )}

      {/* Main Content - Two Column Desktop, Tabbed Mobile */}
      <main className="container mx-auto px-4 py-4 lg:py-6 max-w-7xl">
        {/* Desktop: Two-column layout */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_400px] lg:gap-6">
          {/* LEFT COLUMN: Items + Tax/Tip */}
          <div className="space-y-4">
            {state.currentBill.people.length > 0 ? (
              <CollapsibleItemsTable />
            ) : (
              <Card className="float-card p-12 border-0">
                <CardHeader className="text-center p-0">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-title mb-3">
                    {isNewBillFlow ? "Welcome to SplitSimple!" : "Who's splitting the bill?"}
                  </CardTitle>
                  <p className="text-subtitle max-w-md mx-auto">
                    {isNewBillFlow
                      ? "First, give your bill a name above."
                      : "Add the first person on the right to get started."}
                  </p>
                </CardHeader>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: People + Totals (Sticky) */}
          <div className="sticky top-20 h-fit">
            <div className="float-panel border-0 p-5">
              <TotalsPanel
                isAddingPerson={isAddingPerson}
                setIsAddingPerson={setIsAddingPerson}
                personInputRef={personInputRef}
              />
            </div>
          </div>
        </div>

        {/* Mobile: Tabbed interface */}
        <div className="lg:hidden">
          {state.currentBill.people.length === 0 ? (
            <MobileFirstUI />
          ) : (
            <>
              {activeTab === "items" && (
                <div className="space-y-4 pb-20">
                  <CollapsibleItemsTable />
                </div>
              )}

              {activeTab === "people" && (
                <div className="space-y-4 pb-20">
                  <TotalsPanel
                    isAddingPerson={isAddingPerson}
                    setIsAddingPerson={setIsAddingPerson}
                    personInputRef={personInputRef}
                    compact={false}
                  />
                </div>
              )}

              {activeTab === "total" && (
                <div className="space-y-4 pb-20">
                  <Card className="float-card border-0 p-5">
                    <h3 className="text-lg font-semibold mb-4">Bill Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-mono font-semibold">${summary.subtotal.toFixed(2)}</span>
                      </div>
                      {summary.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="font-mono font-semibold">${summary.tax.toFixed(2)}</span>
                        </div>
                      )}
                      {summary.tip > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tip</span>
                          <span className="font-mono font-semibold">${summary.tip.toFixed(2)}</span>
                        </div>
                      )}
                      {summary.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="font-mono font-semibold text-green-600">-${summary.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total</span>
                          <span className="text-2xl font-bold font-mono">${summary.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCopySummary}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Summary
                    </Button>
                    <ShareBill variant="outline" size="default" showText={true} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      {isMobile && state.currentBill.people.length > 0 && (
        <MobileStickyBar total={summary.total} onShare={handleShare} />
      )}

    </div>
  )
}