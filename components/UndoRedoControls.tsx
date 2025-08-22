"use client"

import { Button } from "@/components/ui/button"
import { Undo2, Redo2 } from "lucide-react"
import { useBill } from "@/contexts/BillContext"
import { useEffect } from "react"

export function UndoRedoControls() {
  const { dispatch, canUndo, canRedo } = useBill()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) {
          dispatch({ type: "UNDO" })
        }
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z")
      ) {
        e.preventDefault()
        if (canRedo) {
          dispatch({ type: "REDO" })
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [dispatch, canUndo, canRedo])

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => dispatch({ type: "UNDO" })}
        disabled={!canUndo}
        className="h-8 w-8 p-0"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => dispatch({ type: "REDO" })}
        disabled={!canRedo}
        className="h-8 w-8 p-0"
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
