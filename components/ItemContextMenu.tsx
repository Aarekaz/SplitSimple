"use client"

import React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Copy, Trash2, UserPlus, UserMinus, Users } from "lucide-react"
import type { Item } from "@/contexts/BillContext"

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
  const allAssigned = item.splitWith.length === peopleCount
  const noneAssigned = item.splitWith.length === 0

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onDuplicate} className="gap-2 cursor-pointer">
          <Copy className="h-4 w-4" />
          <span>Duplicate Item</span>
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onAssignAll}
          disabled={allAssigned}
          className="gap-2 cursor-pointer"
        >
          <Users className="h-4 w-4" />
          <span>Assign All People</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onUnassignAll}
          disabled={noneAssigned}
          className="gap-2 cursor-pointer"
        >
          <UserMinus className="h-4 w-4" />
          <span>Unassign All</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onDelete}
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Item</span>
          <span className="ml-auto text-xs">Del</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
