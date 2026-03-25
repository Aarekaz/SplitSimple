import React from 'react'
import { cn } from '@/lib/utils'

interface GridCellProps {
  row: number
  col: string
  value: string | number
  type?: string
  className?: string
  isSelected: boolean
  isEditing: boolean
  itemId: string
  field: 'name' | 'price' | 'qty'
  onCellEdit: (itemId: string, field: 'name' | 'price' | 'qty', value: string) => void
  onCellClick: (row: number, col: string) => void
  editInputRef: React.RefObject<HTMLInputElement | null>
}

export const GridCell = React.memo(({
  row,
  col,
  value,
  type = 'text',
  className = '',
  isSelected,
  isEditing,
  itemId,
  field,
  onCellEdit,
  onCellClick,
  editInputRef
}: GridCellProps) => {
  const isNumericField = field === 'price' || field === 'qty'
  const inputType = 'text'
  const inputMode = isNumericField ? 'decimal' as const : undefined
  const placeholder =
    field === 'name' ? 'Type item…' :
    field === 'price' ? '0.00' :
    field === 'qty' ? '1' : ''

  if (isEditing) {
    return (
      <div className="absolute inset-0 z-30">
        <input
          ref={editInputRef}
          type={inputType}
          inputMode={inputMode}
          value={value}
          name={`${field}-${itemId}`}
          autoComplete="off"
          aria-label={`Edit ${field}`}
          onChange={e => onCellEdit(itemId, field, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "w-full h-full px-4 py-3 text-sm border-2 border-primary focus:outline-none",
            className
          )}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      role="gridcell"
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected}
      aria-label={`Row ${row + 1} ${field}`}
      onClick={() => onCellClick(row, col)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onCellClick(row, col)
        }
      }}
      className={cn(
        "w-full h-full px-4 py-3 flex items-center cursor-text relative text-left",
        isSelected && "ring-inset ring-2 ring-ring z-10",
        className
      )}
    >
      <span className={cn("truncate w-full", !value && "text-muted-foreground/40 font-normal")}>
        {value ? (field === 'price' ? `$${value}` : value) : placeholder}
      </span>
    </button>
  )
})

GridCell.displayName = 'GridCell'
