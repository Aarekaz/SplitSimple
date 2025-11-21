"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Plus,
  Search,
  Trash2,
  Grid as GridIcon,
  X,
  Equal,
  FileText,
  ClipboardCopy,
  Eraser,
  RotateCcw,
  RotateCw,
  FileQuestion,
  Users,
  Scale,
  Percent,
  Calculator,
  ChevronDown
} from 'lucide-react'
import { useBill } from '@/contexts/BillContext'
import type { Item, Person } from '@/contexts/BillContext'
import { formatCurrency } from '@/lib/utils'
import { getBillSummary, calculateItemSplits } from '@/lib/calculations'
import { generateSummaryText, copyToClipboard } from '@/lib/export'
import { useToast } from '@/hooks/use-toast'
import { ShareBill } from '@/components/ShareBill'
import { BillStatusIndicator } from '@/components/BillStatusIndicator'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'
import { useBillAnalytics } from '@/hooks/use-analytics'
import { TIMING } from '@/lib/constants'
import { getBillFromCloud } from '@/lib/sharing'
import { migrateBillSchema } from '@/lib/validation'

export type SplitMethod = "even" | "shares" | "percent" | "exact"

// --- DESIGN TOKENS ---
const COLORS = [
  { id: 'indigo', bg: 'bg-indigo-100', solid: 'bg-indigo-600', text: 'text-indigo-700', textSolid: 'text-white', hex: '#4F46E5' },
  { id: 'orange', bg: 'bg-orange-100', solid: 'bg-orange-500', text: 'text-orange-700', textSolid: 'text-white', hex: '#F97316' },
  { id: 'rose', bg: 'bg-rose-100', solid: 'bg-rose-500', text: 'text-rose-700', textSolid: 'text-white', hex: '#F43F5E' },
  { id: 'emerald', bg: 'bg-emerald-100', solid: 'bg-emerald-500', text: 'text-emerald-700', textSolid: 'text-white', hex: '#10B981' },
  { id: 'blue', bg: 'bg-blue-100', solid: 'bg-blue-500', text: 'text-blue-700', textSolid: 'text-white', hex: '#3B82F6' },
  { id: 'amber', bg: 'bg-amber-100', solid: 'bg-amber-500', text: 'text-amber-700', textSolid: 'text-white', hex: '#F59E0B' },
]

const formatCurrencySimple = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}

// --- Grid Cell Component (moved outside to prevent re-creation on every render) ---
const GridCell = React.memo(({
  row,
  col,
  value,
  type = 'text',
  className = '',
  isSelected,
  isEditing,
  onEdit,
  onClick,
  editInputRef
}: {
  row: number
  col: string
  value: string | number
  type?: string
  className?: string
  isSelected: boolean
  isEditing: boolean
  onEdit: (value: string) => void
  onClick: () => void
  editInputRef: React.RefObject<HTMLInputElement | null>
}) => {
  if (isEditing) {
    return (
      <div className="absolute inset-0 z-30">
        <input
          ref={editInputRef}
          type={type}
          value={value}
          onChange={e => onEdit(e.target.value)}
          className={`w-full h-full px-4 py-3 text-sm border-2 border-indigo-500 focus:outline-none ${className}`}
        />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`
        w-full h-full px-4 py-3 flex items-center cursor-text relative
        ${isSelected ? 'ring-inset ring-2 ring-indigo-500 z-10' : ''}
        ${className}
      `}
    >
      <span className="truncate w-full">{value}</span>
    </div>
  )
})

GridCell.displayName = 'GridCell'

export function ProBillSplitter() {
  const { state, dispatch, canUndo, canRedo } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const [activeView, setActiveView] = useState<'ledger' | 'breakdown'>('ledger')
  const [billId, setBillId] = useState('')
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string }>({ row: 0, col: 'name' })
  const [editing, setEditing] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string; personId?: string } | null>(null)
  const [splitMethodDropdown, setSplitMethodDropdown] = useState<string | null>(null)
  const [isLoadingBill, setIsLoadingBill] = useState(false)

  const editInputRef = useRef<HTMLInputElement>(null)

  const people = state.currentBill.people
  const items = state.currentBill.items
  const title = state.currentBill.title

  // --- Derived Data ---
  const summary = getBillSummary(state.currentBill)

  const calculatedItems = useMemo(() => items.map(item => {
    const price = parseFloat(item.price || '0')
    const qty = item.quantity || 1
    const totalItemPrice = price * qty
    const splitCount = item.splitWith.length
    const pricePerPerson = splitCount > 0 ? totalItemPrice / splitCount : 0
    return { ...item, totalItemPrice, pricePerPerson, price, qty }
  }), [items])

  const subtotal = calculatedItems.reduce((acc, item) => acc + item.totalItemPrice, 0)
  const taxAmount = parseFloat(state.currentBill.tax || '0')
  const tipAmount = parseFloat(state.currentBill.tip || '0')
  const discountAmount = parseFloat(state.currentBill.discount || '0')
  const grandTotal = subtotal + taxAmount + tipAmount - discountAmount

  const personFinalShares = useMemo(() => {
    const shares: Record<string, {
      subtotal: number
      tax: number
      tip: number
      discount: number
      total: number
      ratio: number
      items: typeof calculatedItems
    }> = {}

    const totalWeight = subtotal > 0 ? subtotal : 1

    people.forEach(p => {
      let personSub = 0
      calculatedItems.forEach(item => {
        if (item.splitWith.includes(p.id)) {
          personSub += item.pricePerPerson
        }
      })

      const ratio = totalWeight > 0 ? personSub / totalWeight : 0
      const tax = taxAmount * ratio
      const tip = tipAmount * ratio
      const disc = discountAmount * ratio

      shares[p.id] = {
        subtotal: personSub,
        tax,
        tip,
        discount: disc,
        total: personSub + tax + tip - disc,
        ratio: ratio * 100,
        items: calculatedItems.filter(i => i.splitWith.includes(p.id))
      }
    })

    return shares
  }, [calculatedItems, people, subtotal, taxAmount, tipAmount, discountAmount])

  // --- Actions ---
  const toggleAssignment = useCallback((itemId: string, personId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const isAssigned = item.splitWith.includes(personId)
    const newSplitWith = isAssigned
      ? item.splitWith.filter(id => id !== personId)
      : [...item.splitWith, personId]

    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, splitWith: newSplitWith }
    })
  }, [items, dispatch])

  const toggleAllAssignments = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const allAssigned = people.every(p => item.splitWith.includes(p.id))
    const newSplitWith = allAssigned ? [] : people.map(p => p.id)

    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, splitWith: newSplitWith }
    })
  }

  const clearRowAssignments = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, splitWith: [] }
    })
  }

  const updateItem = (id: string, updates: Partial<Item>) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, ...updates }
    })
  }

  const addItem = useCallback(() => {
    const newItem: Omit<Item, 'id'> = {
      name: '',
      price: '0',
      quantity: 1,
      splitWith: people.map(p => p.id),
      method: 'even'
    }
    dispatch({ type: 'ADD_ITEM', payload: newItem })
    analytics.trackItemAdded('0', 'even', people.length)
  }, [people, dispatch, analytics])

  const deleteItem = (id: string) => {
    const item = items.find(i => i.id === id)
    dispatch({ type: 'REMOVE_ITEM', payload: id })
    if (item) {
      analytics.trackItemRemoved(item.method)
      toast({ title: "Item deleted", duration: TIMING.TOAST_SHORT })
    }
  }

  const duplicateItem = (item: Item) => {
    const duplicated: Omit<Item, 'id'> = {
      name: `${item.name} (copy)`,
      price: item.price,
      quantity: item.quantity,
      splitWith: [...item.splitWith],
      method: item.method,
      customSplits: item.customSplits ? { ...item.customSplits } : undefined
    }
    dispatch({ type: 'ADD_ITEM', payload: duplicated })
    analytics.trackFeatureUsed("duplicate_item")
    toast({ title: "Item duplicated" })
  }

  const addPerson = useCallback(() => {
    const newName = `Person ${people.length + 1}`
    dispatch({
      type: 'ADD_PERSON',
      payload: {
        name: newName,
        color: COLORS[people.length % COLORS.length].hex
      }
    })
    analytics.trackPersonAdded("manual")
    toast({ title: "Person added", description: newName })
  }, [people, dispatch, analytics, toast])

  const updatePerson = (updatedPerson: Person) => {
    dispatch({
      type: 'UPDATE_PERSON',
      payload: updatedPerson
    })
    toast({
      title: "Person updated",
      description: `${updatedPerson.name}'s details have been updated`
    })
    analytics.trackFeatureUsed("update_person")
    setEditingPerson(null)
  }

  const removePerson = (personId: string) => {
    const person = people.find(p => p.id === personId)
    const hadItems = items.some(i => i.splitWith.includes(personId))
    dispatch({ type: 'REMOVE_PERSON', payload: personId })
    if (person) {
      analytics.trackPersonRemoved(hadItems)
      toast({ title: "Person removed", description: person.name })
    }
    setEditingPerson(null)
  }

  // --- Split Method Management ---
  const splitMethodOptions = [
    { value: 'even' as SplitMethod, label: 'Even Split', icon: Users },
    { value: 'shares' as SplitMethod, label: 'By Shares', icon: Scale },
    { value: 'percent' as SplitMethod, label: 'By Percent', icon: Percent },
    { value: 'exact' as SplitMethod, label: 'Exact Amount', icon: Calculator },
  ]

  const getSplitMethodIcon = (method: SplitMethod) => {
    const option = splitMethodOptions.find(o => o.value === method)
    return option?.icon || Users
  }

  const changeSplitMethod = (itemId: string, newMethod: SplitMethod) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const oldMethod = item.method
    updateItem(itemId, { method: newMethod })
    analytics.trackSplitMethodChanged(itemId, oldMethod, newMethod, item.splitWith.length)
    toast({
      title: "Split method changed",
      description: `Changed to ${splitMethodOptions.find(o => o.value === newMethod)?.label}`,
      duration: TIMING.TOAST_SHORT
    })
    setSplitMethodDropdown(null)
  }

  // --- Bill ID Loading ---
  const handleLoadBill = useCallback(async () => {
    const trimmedId = billId.trim()
    if (!trimmedId) {
      toast({
        title: "Enter Bill ID",
        description: "Please enter a bill ID to load",
        variant: "destructive"
      })
      return
    }

    setIsLoadingBill(true)
    analytics.trackFeatureUsed("load_bill_by_id", { bill_id: trimmedId })

    try {
      const result = await getBillFromCloud(trimmedId)

      if (result.error || !result.bill) {
        toast({
          title: "Bill not found",
          description: result.error || "Could not find bill with that ID",
          variant: "destructive"
        })
        analytics.trackError("load_bill_failed", result.error || "Bill not found")
        return
      }

      const migratedBill = migrateBillSchema(result.bill)
      dispatch({ type: 'LOAD_BILL', payload: migratedBill })
      toast({
        title: "Bill loaded!",
        description: `Loaded "${migratedBill.title}"`
      })
      analytics.trackSharedBillLoaded("cloud")
      setBillId('') // Clear input after successful load
    } catch (error) {
      toast({
        title: "Load failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
      analytics.trackError("load_bill_failed", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsLoadingBill(false)
    }
  }, [billId, dispatch, toast, analytics])

  // --- Copy Breakdown ---
  const copyBreakdown = useCallback(async () => {
    if (people.length === 0) {
      toast({
        title: "No data to copy",
        description: "Add people and items to generate a summary",
        variant: "destructive"
      })
      analytics.trackError("copy_summary_failed", "No data to copy")
      return
    }

    const text = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(text)
    if (success) {
      toast({
        title: "Copied!",
        description: "Bill summary copied to clipboard"
      })
      analytics.trackBillSummaryCopied()
      analytics.trackFeatureUsed("copy_summary")
    } else {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive"
      })
      analytics.trackError("copy_summary_failed", "Clipboard API failed")
    }
  }, [people, state.currentBill, toast, analytics])

  // --- Context Menu ---
  const handleContextMenu = (e: React.MouseEvent, itemId: string, personId?: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      itemId,
      personId
    })
  }

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null)
      setSplitMethodDropdown(null)
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // --- Global Keyboard Shortcuts ---
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if we're in an input field
    const target = e.target as HTMLElement
    const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'

    // Global shortcuts that work even in inputs
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      dispatch({ type: 'UNDO' })
      toast({ title: "Undo", duration: TIMING.TOAST_SHORT })
      analytics.trackUndoRedoUsed("undo", state.historyIndex)
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault()
      dispatch({ type: 'REDO' })
      toast({ title: "Redo", duration: TIMING.TOAST_SHORT })
      analytics.trackUndoRedoUsed("redo", state.historyIndex)
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault()
      if (confirm('Start a new bill? Current bill will be lost if not shared.')) {
        dispatch({ type: 'NEW_BILL' })
        toast({ title: "New bill created" })
        analytics.trackBillCreated()
        analytics.trackFeatureUsed("keyboard_shortcut_new_bill")
      }
      return
    }

    // Shortcuts that don't work in inputs
    if (!isInInput) {
      // N: Add new item
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        addItem()
        analytics.trackFeatureUsed("keyboard_shortcut_add_item")
        return
      }

      // P: Add person
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        addPerson()
        analytics.trackFeatureUsed("keyboard_shortcut_add_person")
        return
      }

      // C: Copy summary
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        copyBreakdown()
        analytics.trackFeatureUsed("keyboard_shortcut_copy")
        return
      }

      // S: Share (trigger click on share button)
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        // Find and click the share button
        const shareButton = document.querySelector('[data-share-trigger]') as HTMLButtonElement
        if (shareButton) shareButton.click()
        analytics.trackFeatureUsed("keyboard_shortcut_share")
        return
      }
    }

    // Grid navigation (only when not editing)
    if (activeView !== 'ledger') return
    if (editing) {
      if (e.key === 'Enter') {
        e.preventDefault()
        setEditing(false)
        if (selectedCell.row < items.length - 1) {
          setSelectedCell(prev => ({ ...prev, row: prev.row + 1 }))
        } else {
          addItem()
        }
      } else if (e.key === 'Escape') {
        setEditing(false)
      }
      return
    }

    if (e.key.startsWith('Arrow')) {
      e.preventDefault()
      const colOrder = ['name', 'price', 'qty', ...people.map(p => p.id)]
      let colIdx = colOrder.indexOf(selectedCell.col)
      let rowIdx = selectedCell.row

      if (e.key === 'ArrowRight' && colIdx < colOrder.length - 1) colIdx++
      if (e.key === 'ArrowLeft' && colIdx > 0) colIdx--
      if (e.key === 'ArrowDown' && rowIdx < items.length - 1) rowIdx++
      if (e.key === 'ArrowUp' && rowIdx > 0) rowIdx--

      setSelectedCell({ row: rowIdx, col: colOrder[colIdx] })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (people.some(p => p.id === selectedCell.col)) {
        const item = items[selectedCell.row]
        if (item) toggleAssignment(item.id, selectedCell.col)
      } else {
        setEditing(true)
      }
    } else if (e.key === ' ') {
      e.preventDefault()
      if (people.some(p => p.id === selectedCell.col)) {
        const item = items[selectedCell.row]
        if (item) toggleAssignment(item.id, selectedCell.col)
      }
    }
  }, [activeView, editing, selectedCell, items, people, addItem, toggleAssignment, addPerson, copyBreakdown, dispatch, toast, analytics, state.historyIndex])

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editing])

  return (
    <div className="pro-app-shell selection:bg-indigo-100 selection:text-indigo-900">
      {/* --- Header --- */}
      <header className="pro-header">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-slate-900 rounded-lg shadow-md flex items-center justify-center text-white">
            <GridIcon size={16} strokeWidth={2.5} />
          </div>
          <div>
            <input
              value={title}
              onChange={(e) => {
                dispatch({ type: 'SET_BILL_TITLE', payload: e.target.value })
                analytics.trackTitleChanged(e.target.value)
              }}
              className="block text-sm font-bold bg-transparent border-none p-0 focus:ring-0 text-slate-900 w-48 hover:text-indigo-600 transition-colors truncate font-inter"
              placeholder="Project Name"
            />
            <div className="text-[10px] font-medium text-slate-400 tracking-wide mt-0.5">SPLIT SIMPLE PRO</div>
          </div>

          {/* New Bill Button */}
          <button
            onClick={() => {
              if (confirm('Start a new bill? Current bill will be lost if not shared.')) {
                dispatch({ type: 'NEW_BILL' })
                toast({ title: "New bill created" })
                analytics.trackBillCreated()
                analytics.trackFeatureUsed("new_bill")
              }
            }}
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md text-xs font-bold text-slate-600 hover:text-slate-900 transition-all shadow-sm flex items-center gap-2 font-inter"
            title="New Bill (Cmd+N)"
          >
            <FileQuestion size={14} /> <span className="hidden md:inline">New</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Bill ID Loader */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input
                type="text"
                value={billId}
                onChange={(e) => setBillId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLoadBill()
                  }
                }}
                placeholder="Bill ID..."
                disabled={isLoadingBill}
                className="h-8 w-32 pl-7 pr-2 bg-slate-50 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white transition-colors disabled:opacity-50 font-mono"
              />
            </div>
            <button
              onClick={handleLoadBill}
              disabled={isLoadingBill || !billId.trim()}
              className="h-8 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title="Load Bill (Enter)"
            >
              {isLoadingBill ? (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
              ) : (
                'Load'
              )}
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          {/* Status & Sync */}
          <BillStatusIndicator compact={true} showSelector={true} />
          <SyncStatusIndicator compact />

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          {/* Share Button */}
          <ShareBill variant="outline" size="sm" showText={true} />

          <div className="hidden lg:block ml-2">
            <a
              href="https://anuragd.me"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 font-inter"
            >
              Crafted by <span className="underline decoration-slate-300 underline-offset-2">Anurag Dhungana</span>
            </a>
          </div>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main className="pro-main">
        {/* LEDGER VIEW */}
        {activeView === 'ledger' && (
          <div className="h-full w-full">
            <div className="h-full overflow-auto px-6 py-6 outline-none pro-scrollbar" tabIndex={-1}>
              <div className="min-w-max mx-auto bg-white rounded-lg border border-slate-200 shadow-sm">
                {/* Live Roster */}
                <div className="flex items-center gap-6 px-4 py-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 font-inter">
                    Live Breakdown
                  </div>
                  <div className="h-4 w-px bg-slate-200 shrink-0"></div>
                  {people.map(p => {
                    const stats = personFinalShares[p.id]
                    const colorObj = COLORS[p.colorIdx || 0]
                    const percent = stats ? (stats.total / (grandTotal || 1)) * 100 : 0
                    return (
                      <div key={p.id} className="flex items-center gap-2 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${colorObj.solid}`}></div>
                        <span className="text-xs font-medium text-slate-600 font-inter">{p.name.split(' ')[0]}</span>
                        <span className="text-xs font-bold font-space-mono text-slate-900">
                          {formatCurrencySimple(stats?.total || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-space-mono">
                          ({percent.toFixed(0)}%)
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Sticky Header */}
                <div className="pro-grid-header flex text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="w-12 p-3 text-center border-r border-slate-100 flex items-center justify-center">#</div>
                  <div className="w-72 p-3 border-r border-slate-100 flex items-center pro-sticky-left">Item Description</div>
                  <div className="w-28 p-3 text-right border-r border-slate-100 flex items-center justify-end">Price</div>
                  <div className="w-20 p-3 text-center border-r border-slate-100 flex items-center justify-center">Qty</div>

                  {people.map(p => {
                    const colorObj = COLORS[p.colorIdx || 0]
                    const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <div
                        key={p.id}
                        className={`w-28 p-2 border-r border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors ${hoveredColumn === p.id ? 'bg-slate-50' : ''}`}
                        onMouseEnter={() => setHoveredColumn(p.id)}
                        onMouseLeave={() => setHoveredColumn(null)}
                        onClick={() => setEditingPerson(p)}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white mb-1 ${colorObj.solid}`}>
                          {initials}
                        </div>
                        <span className="text-[9px] truncate max-w-full font-bold text-slate-700 font-inter">
                          {p.name.split(' ')[0]}
                        </span>
                      </div>
                    )
                  })}

                  <div className="w-12 flex items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors" onClick={addPerson}>
                    <Plus size={16} />
                  </div>
                  <div className="w-28 p-3 text-right flex items-center justify-end border-l border-slate-200 pro-sticky-right">
                    Total
                  </div>
                </div>

                {/* Body */}
                <div className="divide-y divide-slate-100">
                  {calculatedItems.map((item, rIdx) => (
                    <div
                      key={item.id}
                      className="flex group hover:bg-slate-50/50 transition-colors h-12 text-sm"
                      onContextMenu={(e) => handleContextMenu(e, item.id)}
                    >
                      {/* Index / "Equal" Button */}
                      <div className="w-12 border-r border-slate-100 flex items-center justify-center text-[10px] text-slate-300 font-space-mono select-none bg-slate-50/30 group-hover:bg-white transition-colors">
                        <span className="group-hover:hidden">{String(rIdx + 1).padStart(2, '0')}</span>
                        <button
                          onClick={() => toggleAllAssignments(item.id)}
                          className="hidden group-hover:flex w-full h-full items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-colors"
                          title="Split Equally"
                        >
                          <Equal size={14} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Name + Split Method Selector */}
                      <div className="w-72 border-r border-slate-100 pro-sticky-left group-hover:bg-slate-50 transition-colors relative p-0 flex items-center">
                        <div className="flex-1">
                          <GridCell
                            row={rIdx}
                            col="name"
                            value={item.name}
                            className="text-slate-700 font-medium bg-transparent font-inter"
                            isSelected={selectedCell.row === rIdx && selectedCell.col === 'name'}
                            isEditing={editing && selectedCell.row === rIdx && selectedCell.col === 'name'}
                            onEdit={(value) => updateItem(item.id, { name: value })}
                            onClick={() => {
                              setSelectedCell({ row: rIdx, col: 'name' })
                              setEditing(true)
                            }}
                            editInputRef={editInputRef}
                          />
                        </div>
                        <div className="relative pr-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSplitMethodDropdown(splitMethodDropdown === item.id ? null : item.id)
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1"
                            title="Change split method"
                          >
                            {React.createElement(getSplitMethodIcon(item.method), { size: 12 })}
                            <ChevronDown size={10} />
                          </button>
                          {splitMethodDropdown === item.id && (
                            <div
                              className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 w-40 py-1 z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {splitMethodOptions.map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => changeSplitMethod(item.id, option.value)}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors font-inter ${item.method === option.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}
                                >
                                  {React.createElement(option.icon, { size: 12 })}
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="w-28 border-r border-slate-100 relative p-0">
                        <GridCell
                          row={rIdx}
                          col="price"
                          value={item.price}
                          type="number"
                          className="text-right font-space-mono text-slate-600 bg-slate-50/30"
                          isSelected={selectedCell.row === rIdx && selectedCell.col === 'price'}
                          isEditing={editing && selectedCell.row === rIdx && selectedCell.col === 'price'}
                          onEdit={(value) => updateItem(item.id, { price: value })}
                          onClick={() => {
                            setSelectedCell({ row: rIdx, col: 'price' })
                            setEditing(true)
                          }}
                          editInputRef={editInputRef}
                        />
                      </div>

                      {/* Qty */}
                      <div className="w-20 border-r border-slate-100 relative p-0">
                        <GridCell
                          row={rIdx}
                          col="qty"
                          value={item.qty}
                          type="number"
                          className="text-center font-space-mono text-slate-500 bg-slate-50/30"
                          isSelected={selectedCell.row === rIdx && selectedCell.col === 'qty'}
                          isEditing={editing && selectedCell.row === rIdx && selectedCell.col === 'qty'}
                          onEdit={(value) => updateItem(item.id, { quantity: parseInt(value) || 1 })}
                          onClick={() => {
                            setSelectedCell({ row: rIdx, col: 'qty' })
                            setEditing(true)
                          }}
                          editInputRef={editInputRef}
                        />
                      </div>

                      {/* Person Cells (The "Cards") */}
                      {people.map(p => {
                        const isAssigned = item.splitWith.includes(p.id)
                        const isSelected = selectedCell.row === rIdx && selectedCell.col === p.id
                        const color = COLORS[p.colorIdx || 0]

                        return (
                          <div
                            key={p.id}
                            onContextMenu={(e) => {
                              e.stopPropagation()
                              handleContextMenu(e, item.id, p.id)
                            }}
                            onClick={() => {
                              setSelectedCell({ row: rIdx, col: p.id })
                              toggleAssignment(item.id, p.id)
                            }}
                            onMouseEnter={() => setHoveredColumn(p.id)}
                            onMouseLeave={() => setHoveredColumn(null)}
                            className={`
                              w-28 border-r border-slate-100 relative cursor-pointer flex items-center justify-center transition-all duration-100 select-none
                              ${isSelected ? `ring-inset ring-2 ring-indigo-600 z-10` : ''}
                              ${hoveredColumn === p.id && !isAssigned ? 'bg-slate-50' : ''}
                            `}
                          >
                            {isAssigned ? (
                              <div
                                className={`w-20 py-1.5 rounded-md shadow-sm text-center transform transition-transform active:scale-95 ${color.solid} ${color.textSolid}`}
                              >
                                <span className="font-space-mono text-xs font-bold">
                                  {(item.pricePerPerson || 0).toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-space-mono text-sm font-bold opacity-50 select-none">
                                -
                              </span>
                            )}
                          </div>
                        )
                      })}

                      {/* Empty Column */}
                      <div className="w-12 border-r border-slate-100 flex items-center justify-center">
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          tabIndex={-1}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Row Total */}
                      <div className="w-28 pro-sticky-right border-l border-slate-200 flex items-center justify-end px-4 group-hover:bg-slate-50 font-space-mono text-xs font-bold text-slate-800">
                        {(item.totalItemPrice || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {/* Add Row Button */}
                  <button
                    onClick={addItem}
                    className="w-full py-3 text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 border-t border-slate-200 font-inter"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BREAKDOWN VIEW */}
        {activeView === 'breakdown' && (
          <div className="h-full overflow-auto p-6 bg-slate-50 pro-scrollbar">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
                {/* LEFT: Bill Summary Receipt */}
                <div className="md:col-span-5 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900"></div>

                    <div className="mb-6">
                      <h2 className="text-lg font-bold text-slate-900 mb-1 font-inter">{title}</h2>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-inter">Bill Summary</p>
                    </div>

                    <div className="space-y-2 mb-6 font-space-mono text-sm text-slate-600">
                      {calculatedItems.map(item => (
                        <div key={item.id} className="flex justify-between">
                          <span className="truncate pr-4">{item.name}</span>
                          <span>{formatCurrencySimple(item.totalItemPrice)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-4 space-y-2 font-space-mono text-sm">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span>{formatCurrencySimple(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Tax</span>
                        <span>{formatCurrencySimple(taxAmount)}</span>
                      </div>
                      {tipAmount > 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>Tip</span>
                          <span>{formatCurrencySimple(tipAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100">
                        <span>Grand Total</span>
                        <span>{formatCurrencySimple(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Individual Breakdowns */}
                <div className="md:col-span-7 space-y-4">
                  {people.map(p => {
                    const stats = personFinalShares[p.id]
                    const colorObj = COLORS[p.colorIdx || 0]
                    const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

                    return (
                      <div key={p.id} className="bg-white rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white ${colorObj.solid}`}>
                              {initials}
                            </div>
                            <div className="font-bold text-slate-900 font-inter">{p.name}</div>
                          </div>
                          <div className="font-space-mono font-bold text-slate-900">
                            {formatCurrencySimple(stats?.total || 0)}
                          </div>
                        </div>
                        <div className="p-4">
                          {/* Share Graph */}
                          <div className="mb-5">
                            <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold mb-2 font-inter">
                              <span>Share</span>
                              <span>{stats?.ratio.toFixed(1) || 0}%</span>
                            </div>
                            <div className="flex gap-1.5 h-2">
                              {[...Array(10)].map((_, i) => {
                                const filled = i < Math.round((stats?.ratio || 0) / 10)
                                return (
                                  <div
                                    key={i}
                                    className={`flex-1 rounded-full transition-colors ${filled ? colorObj.solid : 'bg-slate-100'}`}
                                  ></div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="space-y-1 mb-4">
                            {stats?.items.map(item => (
                              <div key={item.id} className="flex justify-between text-sm text-slate-600">
                                <span className="flex items-center gap-2 font-inter">
                                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div> {item.name}
                                </span>
                                <span className="font-space-mono text-xs">
                                  {formatCurrencySimple(item.pricePerPerson)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-3 border-t border-slate-50 flex gap-4 text-xs text-slate-400 font-space-mono">
                            <span className="flex gap-1">
                              Sub: <span className="text-slate-600">{formatCurrencySimple(stats?.subtotal || 0)}</span>
                            </span>
                            <span className="flex gap-1">
                              Tax: <span className="text-slate-600">{formatCurrencySimple(stats?.tax || 0)}</span>
                            </span>
                            {stats?.tip > 0 && (
                              <span className="flex gap-1">
                                Tip: <span className="text-slate-600">{formatCurrencySimple(stats.tip)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- Footer --- */}
      <footer className="pro-footer">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-md">
            <button
              onClick={() => setActiveView('ledger')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 font-inter ${activeView === 'ledger' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <GridIcon size={14} /> Ledger
            </button>
            <button
              onClick={() => setActiveView('breakdown')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 font-inter ${activeView === 'breakdown' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText size={14} /> Breakdown
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 hidden md:block"></div>

          {/* Copy Button (Breakdown Only) */}
          {activeView === 'breakdown' && (
            <button
              onClick={copyBreakdown}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors font-inter"
            >
              <ClipboardCopy size={14} /> Copy Text
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                dispatch({ type: 'UNDO' })
                toast({ title: "Undone", duration: TIMING.TOAST_SHORT })
                analytics.trackUndoRedoUsed("undo", state.historyIndex)
              }}
              disabled={!canUndo}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Cmd+Z)"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'REDO' })
                toast({ title: "Redone", duration: TIMING.TOAST_SHORT })
                analytics.trackUndoRedoUsed("redo", state.historyIndex)
              }}
              disabled={!canRedo}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Cmd+Shift+Z)"
            >
              <RotateCw size={16} />
            </button>
          </div>

          {activeView === 'ledger' && (
            <div className="flex items-center gap-3 border-l border-r border-slate-200 px-6">
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-400 uppercase text-[10px] font-inter">Tax</label>
                <input
                  type="number"
                  value={state.currentBill.tax}
                  onChange={(e) => {
                    dispatch({ type: 'SET_TAX', payload: e.target.value })
                    analytics.trackTaxTipDiscountUsed("tax", e.target.value, state.currentBill.taxTipAllocation)
                  }}
                  className="w-16 bg-slate-50 rounded px-2 py-1 border border-slate-200 focus:border-indigo-500 focus:bg-white transition-colors text-xs font-space-mono text-slate-700 text-right"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-400 uppercase text-[10px] font-inter">Tip</label>
                <input
                  type="number"
                  value={state.currentBill.tip}
                  onChange={(e) => {
                    dispatch({ type: 'SET_TIP', payload: e.target.value })
                    analytics.trackTaxTipDiscountUsed("tip", e.target.value, state.currentBill.taxTipAllocation)
                  }}
                  className="w-16 bg-slate-50 rounded px-2 py-1 border border-slate-200 focus:border-indigo-500 focus:bg-white transition-colors text-xs font-space-mono text-slate-700 text-right"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-400 uppercase text-[10px] font-inter">Disc</label>
                <input
                  type="number"
                  value={state.currentBill.discount}
                  onChange={(e) => {
                    dispatch({ type: 'SET_DISCOUNT', payload: e.target.value })
                    analytics.trackTaxTipDiscountUsed("discount", e.target.value, state.currentBill.taxTipAllocation)
                  }}
                  className="w-16 bg-slate-50 rounded px-2 py-1 border border-slate-200 focus:border-indigo-500 focus:bg-white transition-colors text-xs font-space-mono text-slate-700 text-right"
                />
              </div>

              {/* Allocation Toggle */}
              <div className="h-4 w-px bg-slate-200"></div>
              <button
                onClick={() => {
                  const newAllocation = state.currentBill.taxTipAllocation === 'proportional' ? 'even' : 'proportional'
                  dispatch({ type: 'SET_TAX_TIP_ALLOCATION', payload: newAllocation })
                  toast({
                    title: "Allocation changed",
                    description: `Tax/Tip split ${newAllocation === 'proportional' ? 'proportionally' : 'evenly'}`,
                    duration: TIMING.TOAST_SHORT
                  })
                  analytics.trackFeatureUsed("tax_tip_allocation_toggle", { allocation: newAllocation })
                }}
                className="flex flex-col items-center gap-0.5 px-2 py-1 hover:bg-slate-50 rounded transition-colors"
                title={`Current: ${state.currentBill.taxTipAllocation === 'proportional' ? 'Proportional' : 'Even'} allocation`}
              >
                <div className="flex items-center gap-1">
                  {state.currentBill.taxTipAllocation === 'proportional' ? (
                    <Scale size={12} className="text-indigo-600" />
                  ) : (
                    <Equal size={12} className="text-indigo-600" />
                  )}
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-inter">
                    {state.currentBill.taxTipAllocation === 'proportional' ? 'Prop' : 'Even'}
                  </span>
                </div>
                <span className="text-[8px] text-slate-400 font-inter">Allocation</span>
              </button>
            </div>
          )}
          <div className="flex flex-col items-end justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5 font-inter">
              Grand Total
            </span>
            <span className="font-space-mono font-bold text-slate-900 leading-none text-lg">
              {formatCurrencySimple(grandTotal)}
            </span>
          </div>
        </div>
      </footer>

      {/* --- Context Menu --- */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 w-48 py-1 overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-inter">
            Actions
          </div>
          {contextMenu.personId ? (
            <button
              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 font-inter"
              onClick={() => {
                toggleAssignment(contextMenu.itemId, contextMenu.personId!)
                setContextMenu(null)
              }}
            >
              Toggle Assignment
            </button>
          ) : (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 font-inter"
                onClick={() => {
                  const item = items.find(i => i.id === contextMenu.itemId)
                  if (item) duplicateItem(item)
                  setContextMenu(null)
                }}
              >
                <Plus size={14} /> Duplicate Item
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 font-inter"
                onClick={() => {
                  toggleAllAssignments(contextMenu.itemId)
                  setContextMenu(null)
                }}
              >
                <Equal size={14} /> Split with Everyone
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 font-inter"
                onClick={() => {
                  clearRowAssignments(contextMenu.itemId)
                  setContextMenu(null)
                }}
              >
                <Eraser size={14} /> Clear Row
              </button>
            </>
          )}
          <div className="h-px bg-slate-100 my-1"></div>
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-inter"
            onClick={() => {
              deleteItem(contextMenu.itemId)
              setContextMenu(null)
            }}
          >
            <Trash2 size={14} /> Delete Item
          </button>
        </div>
      )}

      {/* --- Person Editor Modal --- */}
      {editingPerson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
          onClick={() => setEditingPerson(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-slate-900 font-inter">Edit Member</h3>
              <button
                onClick={() => setEditingPerson(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1 rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-inter">
                  Display Name
                </label>
                <input
                  autoFocus
                  value={editingPerson.name}
                  onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-inter"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3 font-inter">
                  Color Theme
                </label>
                <div className="flex gap-3 flex-wrap">
                  {COLORS.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => setEditingPerson({ ...editingPerson, colorIdx: idx, color: c.hex })}
                      className={`w-8 h-8 rounded-full ${c.solid} border-2 border-white shadow-sm transition-transform hover:scale-110 ${editingPerson.colorIdx === idx ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => removePerson(editingPerson.id)}
                  className="flex-1 py-2.5 rounded-lg border border-red-100 text-red-600 text-xs font-bold uppercase tracking-wide hover:bg-red-50 transition-colors font-inter"
                >
                  Remove
                </button>
                <button
                  onClick={() => updatePerson(editingPerson)}
                  className="flex-[2] py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold uppercase tracking-wide hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 font-inter"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
