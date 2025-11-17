"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { HelpCircle, Plus, Users, Copy, Share2, Undo, Redo, Trash2 } from "lucide-react"

interface Shortcut {
  key: string
  description: string
  icon: React.ReactNode
  category: string
}

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  const shortcuts: Shortcut[] = [
    {
      key: "N",
      description: "Add new item to bill",
      icon: <Plus className="h-4 w-4" />,
      category: "Actions"
    },
    {
      key: "P",
      description: "Add person to split",
      icon: <Users className="h-4 w-4" />,
      category: "Actions"
    },
    {
      key: "C",
      description: "Copy bill summary",
      icon: <Copy className="h-4 w-4" />,
      category: "Actions"
    },
    {
      key: "S",
      description: "Share bill",
      icon: <Share2 className="h-4 w-4" />,
      category: "Actions"
    },
    {
      key: "⌘Z / Ctrl+Z",
      description: "Undo last action",
      icon: <Undo className="h-4 w-4" />,
      category: "Edit"
    },
    {
      key: "⌘⇧Z / Ctrl+Shift+Z",
      description: "Redo last action",
      icon: <Redo className="h-4 w-4" />,
      category: "Edit"
    },
    {
      key: "⌘D / Ctrl+D",
      description: "Duplicate focused item",
      icon: <Copy className="h-4 w-4" />,
      category: "Items"
    },
    {
      key: "Delete",
      description: "Delete focused item",
      icon: <Trash2 className="h-4 w-4" />,
      category: "Items"
    }
  ]

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, Shortcut[]>)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
          title="Keyboard shortcuts (Press ?)"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to speed up your workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground">
                        {shortcut.icon}
                      </div>
                      <span className="text-sm">{shortcut.description}</span>
                    </div>
                    <kbd className="px-2.5 py-1.5 bg-muted text-muted-foreground rounded text-xs font-medium border border-border/50 min-w-[40px] text-center">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded font-medium mx-1">?</kbd> anytime to open this panel
        </div>
      </DialogContent>
    </Dialog>
  )
}
