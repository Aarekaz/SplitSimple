"use client"

import React, { useState } from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Copy, Trash2, UserPlus, UserMinus, Users } from "lucide-react"
import type { Item } from "@/contexts/BillContext"
import { useLongPress } from "@/hooks/use-long-press"
import { useIsMobile } from "@/hooks/use-mobile"

interface ItemContextMenuProps {
  item: Item
  children: React.ReactNode
  onDuplicate: () => void
  onDelete: () => void
  onAssignAll: () => void
  onUnassignAll: () => void
  peopleCount: number
}

export function ItemContextMenu({
  item,
  children,
  onDuplicate,
  onDelete,
  onAssignAll,
  onUnassignAll,
  peopleCount
}: ItemContextMenuProps) {
  const isMobile = useIsMobile()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const allAssigned = item.splitWith.length === peopleCount
  const noneAssigned = item.splitWith.length === 0

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (isMobile) {
        setIsDropdownOpen(true)
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    },
    threshold: 500,
  })

  // Menu items component to avoid duplication
  const MenuItems = ({ onClose }: { onClose?: () => void }) => (
    <>
      <ContextMenuItem
        onClick={() => {
          onDuplicate()
          onClose?.()
        }}
        className="gap-2 cursor-pointer"
      >
        <Copy className="h-4 w-4" />
        <span>Duplicate Item</span>
        {!isMobile && <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>}
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem
        onClick={() => {
          onAssignAll()
          onClose?.()
        }}
        disabled={allAssigned}
        className="gap-2 cursor-pointer"
      >
        <Users className="h-4 w-4" />
        <span>Assign All People</span>
      </ContextMenuItem>

      <ContextMenuItem
        onClick={() => {
          onUnassignAll()
          onClose?.()
        }}
        disabled={noneAssigned}
        className="gap-2 cursor-pointer"
      >
        <UserMinus className="h-4 w-4" />
        <span>Unassign All</span>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem
        onClick={() => {
          onDelete()
          onClose?.()
        }}
        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete Item</span>
        {!isMobile && <span className="ml-auto text-xs">Del</span>}
      </ContextMenuItem>
    </>
  )

  // On mobile, use Sheet with long-press trigger
  // On desktop, use ContextMenu (right-click)
  if (isMobile) {
    return (
      <>
        <div {...longPressHandlers} className="touch-none">
          {children}
        </div>
        <Sheet open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <SheetContent side="bottom" className="p-0">
            <SheetHeader className="p-6 pb-4">
              <SheetTitle>Item Actions</SheetTitle>
            </SheetHeader>
            <div className="px-6 pb-6 space-y-2">
              <Button
                onClick={() => {
                  onDuplicate()
                  setIsDropdownOpen(false)
                }}
                variant="outline"
                className="w-full justify-start gap-3"
              >
                <Copy className="h-4 w-4" />
                <span>Duplicate Item</span>
              </Button>

              <Separator />

              <Button
                onClick={() => {
                  onAssignAll()
                  setIsDropdownOpen(false)
                }}
                disabled={allAssigned}
                variant="outline"
                className="w-full justify-start gap-3"
              >
                <Users className="h-4 w-4" />
                <span>Assign All People</span>
              </Button>

              <Button
                onClick={() => {
                  onUnassignAll()
                  setIsDropdownOpen(false)
                }}
                disabled={noneAssigned}
                variant="outline"
                className="w-full justify-start gap-3"
              >
                <UserMinus className="h-4 w-4" />
                <span>Unassign All</span>
              </Button>

              <Separator />

              <Button
                onClick={() => {
                  onDelete()
                  setIsDropdownOpen(false)
                }}
                variant="destructive"
                className="w-full justify-start gap-3"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Item</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <MenuItems />
      </ContextMenuContent>
    </ContextMenu>
  )
}
