"use client"

import type React from "react"

import { CollapsibleItemsTable } from "@/components/CollapsibleItemsTable"
import { TotalsPanel } from "@/components/TotalsPanel"
import { MobileTotalsBar } from "@/components/MobileTotalsBar"
import { ExportActions } from "@/components/ExportActions"
import { PeopleManager } from "@/components/PeopleManager"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Receipt, Plus, Users, ChevronDown } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { useState } from "react"

export default function HomePage() {
  const { state, dispatch } = useBill()

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_BILL_TITLE", payload: e.target.value })
  }

  const handleCurrencyChange = (currency: string) => {
    dispatch({ type: "SET_CURRENCY", payload: currency })
  }

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value) || 0
    dispatch({ type: "SET_TAX", payload: value })
  }

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value) || 0
    dispatch({ type: "SET_TIP", payload: value })
  }

  const handleNewBill = () => {
    dispatch({ type: "NEW_BILL" })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">SplitSimple</span>
              </div>

              <Input
                value={state.currentBill.title}
                onChange={handleTitleChange}
                placeholder="Untitled Bill"
                className="h-8 w-48 border-0 bg-transparent text-lg font-semibold text-foreground px-2 focus:bg-input focus:border focus:border-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <ExportActions />
              <Button onClick={handleNewBill} size="sm" className="bg-primary hover:bg-primary/90 h-8">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted border-b border-border px-4 py-2">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Currency:</span>
                <Select value={state.currentBill.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="h-7 w-20 border-0 bg-transparent text-foreground p-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tax:</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.currentBill.tax}
                  onChange={handleTaxChange}
                  placeholder="0"
                  className="h-7 w-16 border-0 bg-transparent text-foreground p-1 text-center"
                  inputMode="decimal"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tip:</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.currentBill.tip}
                  onChange={handleTipChange}
                  placeholder="0"
                  className="h-7 w-16 border-0 bg-transparent text-foreground p-1 text-center"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PeopleManager />
            <CollapsibleItemsTable />
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-6">
              <TotalsPanel />
            </div>
          </div>
        </div>
      </div>

      <MobileTotalsBar />
    </div>
  )
}
