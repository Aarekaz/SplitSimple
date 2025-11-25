"use client"

import { LayoutGrid, LayoutList } from "lucide-react"
import { cn } from "@/lib/utils"

interface ViewToggleProps {
  value: "cards" | "grid"
  onChange: (value: "cards" | "grid") => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex bg-slate-100 p-1 rounded-lg">
      <button
        onClick={() => onChange("cards")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          value === "cards"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        <LayoutList className="h-3.5 w-3.5" />
        <span>Cards</span>
      </button>
      <button
        onClick={() => onChange("grid")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          value === "grid"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>Grid</span>
      </button>
    </div>
  )
}
