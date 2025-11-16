"use client"

import { cn } from "@/lib/utils"
import { ShoppingCart, Users, Receipt } from "lucide-react"

type Tab = "items" | "people" | "total"

interface MobileTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  itemCount: number
  peopleCount: number
}

export function MobileTabs({ activeTab, onTabChange, itemCount, peopleCount }: MobileTabsProps) {
  const tabs = [
    { id: "items" as Tab, label: "ITEMS", icon: ShoppingCart, count: itemCount },
    { id: "people" as Tab, label: "PEOPLE", icon: Users, count: peopleCount },
    { id: "total" as Tab, label: "TOTAL", icon: Receipt, count: null }
  ]

  return (
    <div className="flex items-center justify-around border-b border-border bg-card/50 backdrop-blur-sm sticky top-14 z-30 lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "thermal-tab flex-1 flex items-center justify-center gap-2",
              isActive ? "thermal-tab-active" : "thermal-tab-inactive"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span className={cn(
                "text-xs font-mono px-1.5 py-0.5 rounded",
                isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
