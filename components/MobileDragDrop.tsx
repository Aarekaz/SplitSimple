"use client"

import React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileDragDropProps {
  children: React.ReactNode
  items: string[]
  onDragEnd: (event: DragEndEvent) => void
  disabled?: boolean
}

export function MobileDragDrop({ children, items, onDragEnd, disabled = false }: MobileDragDropProps) {
  const sensors = useSensors(
    // Enhanced touch sensor with better mobile support
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Prevent accidental drags during scrolling
        tolerance: 8, // Allow some movement before activating drag
      },
    }),
    // Pointer sensor for mouse/trackpad
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag
      },
    }),
    // Keyboard sensor for accessibility
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (disabled) {
    return <div>{children}</div>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

interface MobileSortableItemProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export function MobileSortableItem({ 
  id, 
  children, 
  disabled = false, 
  className 
}: MobileSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  }

  if (disabled) {
    return (
      <div ref={setNodeRef} className={className}>
        {children}
      </div>
    )
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "relative",
        isDragging && "opacity-50 shadow-lg scale-105",
        className
      )}
    >
      {/* Mobile-optimized drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 z-10",
          "w-8 h-8 rounded-full",
          "bg-background/90 backdrop-blur-sm border border-border/50",
          "flex items-center justify-center",
          "cursor-grab active:cursor-grabbing",
          "touch-manipulation", // Optimize for touch
          "transition-all duration-200",
          "hover:bg-muted/80 active:scale-95",
          // Show by default on mobile, hide on desktop unless hovering
          "opacity-100 md:opacity-0 md:group-hover:opacity-100"
        )}
        style={{ touchAction: 'manipulation' }}
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Content with padding for drag handle */}
      <div className="pl-12 md:pl-0 md:group-hover:pl-12 transition-all duration-200">
        {children}
      </div>
    </div>
  )
}

// Hook to check if device supports touch
export function useHasTouch() {
  const [hasTouch, setHasTouch] = React.useState(false)

  React.useEffect(() => {
    setHasTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  return hasTouch
}