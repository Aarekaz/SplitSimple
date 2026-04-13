"use client"

import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  ChevronDown,
  Camera,
  Pencil
} from 'lucide-react'
import { useBill } from '@/contexts/BillContext'
import type { Item, Person } from '@/contexts/BillContext'
import { cn } from '@/lib/utils'
import { generateSummaryText, copyToClipboard } from '@/lib/export'
import { useToast } from '@/hooks/use-toast'
import { ShareBill } from '@/components/ShareBill'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'
import { useBillAnalytics } from '@/hooks/use-analytics'
import { TIMING } from '@/lib/constants'
import { getBillFromCloud } from '@/lib/sharing'
import { migrateBillSchema } from '@/lib/validation'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileSpreadsheetView } from '@/components/MobileSpreadsheetView'
import { AnimatedNumber } from '@/components/AnimatedNumber'

import dynamic from 'next/dynamic'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

export const SplitSimpleIcon = () => (
  <div className="w-8 h-8 rounded-lg shadow-md flex items-center justify-center bg-card">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1Z" fill="#16a34a" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17.5v-11" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </div>
)

const formatCurrencySimple = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}

const ReceiptScanner = dynamic(
  () => import('@/components/ReceiptScanner').then((mod) => mod.ReceiptScanner),
  { ssr: false }
)

const ProBillBreakdownView = dynamic(
  () => import('@/components/ProBillBreakdownView'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full overflow-auto p-6 bg-muted pro-scrollbar">
        <div className="max-w-5xl mx-auto text-sm text-muted-foreground">Loading breakdown…</div>
      </div>
    ),
  }
)

// --- Grid Cell Component (moved outside to prevent re-creation on every render) ---
const GridCell = React.memo(({
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
}: {
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
}) => {
  // Use text type with numeric inputMode for number fields (removes spinner arrows)
  const isNumericField = field === 'price' || field === 'qty'
  const inputType = 'text'
  const inputMode = isNumericField ? 'decimal' : undefined
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
        isSelected && "ring-inset ring-2 ring-primary z-10",
        className
      )}
    >
      <span className={cn("truncate w-full", !value && "text-muted-foreground/50 font-normal")}>
        {value ? (field === 'price' ? `$${value}` : value) : placeholder}
      </span>
    </button>
  )
})

GridCell.displayName = 'GridCell'





// --- Split Method Options (constant) ---
const splitMethodOptions = [
  { value: 'even' as SplitMethod, label: 'Even Split', icon: Users },
  { value: 'shares' as SplitMethod, label: 'By Shares', icon: Scale },
  { value: 'percent' as SplitMethod, label: 'By Percent', icon: Percent },
  { value: 'exact' as SplitMethod, label: 'Exact Amount', icon: Calculator },
]

function DesktopBillSplitter() {
  const { state, dispatch, canUndo, canRedo } = useBill()
  const { toast } = useToast()
  const analytics = useBillAnalytics()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const normalizedView = viewParam === 'breakdown' ? 'breakdown' : 'ledger'
  const [activeView, setActiveView] = useState<'ledger' | 'breakdown'>(normalizedView)
  const [billId, setBillId] = useState('')
  const [loadBillError, setLoadBillError] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string }>({ row: 0, col: 'name' })
  const [editing, setEditing] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set())

  const [isLoadingBill, setIsLoadingBill] = useState(false)
  const [newLoadDropdownOpen, setNewLoadDropdownOpen] = useState(false)
  const [hideStarter, setHideStarter] = useState(false)
  const [isNewBillDialogOpen, setIsNewBillDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [pendingDeleteItem, setPendingDeleteItem] = useState<Item | null>(null)
  const [isRemovePersonDialogOpen, setIsRemovePersonDialogOpen] = useState(false)
  const [pendingRemovePerson, setPendingRemovePerson] = useState<Person | null>(null)
  const [isMacPlatform, setIsMacPlatform] = useState(true)

  // Detect platform once on client mount to render correct modifier keys in shortcut hints
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const platform = (navigator.platform || '').toLowerCase()
    const ua = (navigator.userAgent || '').toLowerCase()
    setIsMacPlatform(platform.includes('mac') || ua.includes('mac'))
  }, [])

  const modKey = isMacPlatform ? '⌘' : 'Ctrl'
  const shiftKey = isMacPlatform ? '⇧' : 'Shift'

  const focusRingClass =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  const setView = useCallback((nextView: 'ledger' | 'breakdown') => {
    setActiveView(nextView)
    const params = new URLSearchParams(searchParams.toString())
    if (nextView === 'ledger') {
      params.delete('view')
    } else {
      params.set('view', 'breakdown')
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const editInputRef = useRef<HTMLInputElement>(null)
  const loadBillRequestRef = useRef<string | null>(null) // Track current load request to prevent race conditions
  const previousItemsLengthRef = useRef(0)
  const newBillSourceRef = useRef<'button' | 'shortcut'>('button')
  const hotkeyStateRef = useRef({
    activeView: 'ledger' as 'ledger' | 'breakdown',
    editing: false,
    selectedCell: { row: 0, col: 'name' },
    items: [] as Item[],
    people: [] as Person[],
    editingPerson: null as Person | null,
    historyIndex: 0,
  })
  const hotkeyActionsRef = useRef({
    addItem: () => {},
    addPerson: () => {},
    copyBreakdown: () => {},
    toggleAssignment: (_itemId: string, _personId: string) => {},
    updateItem: (_id: string, _updates: Partial<Item>) => {},
    dispatchUndo: () => {},
    dispatchRedo: () => {},
    toastUndo: () => {},
    toastRedo: () => {},
    closeEditingPerson: () => {},
    stopEditing: () => {},
  })

  const people = state.currentBill.people
  const items = state.currentBill.items
  const title = state.currentBill.title

  // Detect if device is touch-based (mobile/tablet)
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  // --- Derived Data ---
  const hasMeaningfulItems = useMemo(() => {
    return items.some(i => (i.name || '').trim() !== '' || (i.price || '').trim() !== '' || (i.quantity || 1) !== 1)
  }, [items])

  const calculatedItems = useMemo(() => items.map(item => {
    const priceNumber = parseFloat(item.price || '0')
    const qty = item.quantity || 1
    const totalItemPrice = priceNumber * qty
    const splitCount = item.splitWith.length
    const pricePerPerson = splitCount > 0 ? totalItemPrice / splitCount : 0
    return { ...item, totalItemPrice, pricePerPerson, priceNumber, qty }
  }), [items])

  const { subtotal, taxAmount, tipAmount, discountAmount, grandTotal } = useMemo(() => {
    const sub = calculatedItems.reduce((acc, item) => acc + item.totalItemPrice, 0)
    const tax = parseFloat(state.currentBill.tax || '0')
    const tip = parseFloat(state.currentBill.tip || '0')
    const disc = parseFloat(state.currentBill.discount || '0')
    return {
      subtotal: sub,
      taxAmount: tax,
      tipAmount: tip,
      discountAmount: disc,
      grandTotal: sub + tax + tip - disc
    }
  }, [calculatedItems, state.currentBill.tax, state.currentBill.tip, state.currentBill.discount])

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
    const allocation = state.currentBill.taxTipAllocation

    // Work in cents to avoid floating-point penny loss.
    // Last person gets the remainder so totals always sum exactly.
    const taxCents = Math.round(taxAmount * 100)
    const tipCents = Math.round(tipAmount * 100)
    const discCents = Math.round(discountAmount * 100)
    let taxAssigned = 0
    let tipAssigned = 0
    let discAssigned = 0

    const personEntries = people.map(p => {
      let personSub = 0
      calculatedItems.forEach(item => {
        if (item.splitWith.includes(p.id)) {
          personSub += item.pricePerPerson
        }
      })
      const ratio = totalWeight > 0 ? personSub / totalWeight : 0
      return { person: p, personSub, ratio }
    })

    personEntries.forEach(({ person: p, personSub, ratio }, idx) => {
      const isLast = idx === personEntries.length - 1

      let taxShare: number
      let tipShare: number
      let discShare: number

      if (isLast) {
        // Last person gets the remainder — guarantees penny-exact totals
        taxShare = (taxCents - taxAssigned) / 100
        tipShare = (tipCents - tipAssigned) / 100
        discShare = (discCents - discAssigned) / 100
      } else if (allocation === 'even') {
        taxShare = Math.floor(taxCents / people.length) / 100
        tipShare = Math.floor(tipCents / people.length) / 100
        discShare = Math.floor(discCents / people.length) / 100
      } else {
        taxShare = Math.floor(taxCents * ratio) / 100
        tipShare = Math.floor(tipCents * ratio) / 100
        discShare = Math.floor(discCents * ratio) / 100
      }

      taxAssigned += Math.round(taxShare * 100)
      tipAssigned += Math.round(tipShare * 100)
      discAssigned += Math.round(discShare * 100)

      shares[p.id] = {
        subtotal: personSub,
        tax: taxShare,
        tip: tipShare,
        discount: discShare,
        total: personSub + taxShare + tipShare - discShare,
        ratio: ratio * 100,
        items: calculatedItems.filter(i => i.splitWith.includes(p.id))
      }
    })

    return shares
  }, [calculatedItems, people, subtotal, taxAmount, tipAmount, discountAmount, state.currentBill.taxTipAllocation])

  const itemsById = useMemo(() => {
    return new Map(items.map((item) => [item.id, item]))
  }, [items])

  const peopleById = useMemo(() => {
    return new Map(people.map((person) => [person.id, person]))
  }, [people])

  useEffect(() => {
    setExpandedPeople(new Set())
  }, [people.length])

  // --- Actions ---
  const toggleAssignment = useCallback((itemId: string, personId: string) => {
    const item = itemsById.get(itemId)
    if (!item) return

    const isAssigned = item.splitWith.includes(personId)
    const newSplitWith = isAssigned
      ? item.splitWith.filter(id => id !== personId)
      : [...item.splitWith, personId]

    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, splitWith: newSplitWith }
    })
  }, [itemsById, dispatch])

  const toggleAllAssignments = useCallback((itemId: string) => {
    const item = itemsById.get(itemId)
    if (!item) return

    const allAssigned = people.every(p => item.splitWith.includes(p.id))
    const newSplitWith = allAssigned ? [] : people.map(p => p.id)

    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, splitWith: newSplitWith }
    })
  }, [itemsById, people, dispatch])

  const togglePersonExpansion = useCallback((personId: string) => {
    setExpandedPeople(prev => {
      const next = new Set(prev)
      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }
      return next
    })
  }, [])

  const clearRowAssignments = useCallback((itemId: string) => {
    const item = itemsById.get(itemId)
    if (!item) return
    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, splitWith: [] }
    })
  }, [itemsById, dispatch])

  const updateItem = useCallback((id: string, updates: Partial<Item>) => {
    const item = itemsById.get(id)
    if (!item) return
    dispatch({
      type: 'UPDATE_ITEM',
      payload: { ...item, ...updates }
    })
  }, [itemsById, dispatch])

  const addItem = useCallback(() => {
    const newItem: Omit<Item, 'id'> = {
      name: '',
      price: '',
      quantity: 1,
      splitWith: people.map(p => p.id),
      method: 'even'
    }
    dispatch({ type: 'ADD_ITEM', payload: newItem })
    analytics.trackItemAdded('0', 'even', people.length)
  }, [people, dispatch, analytics])

  const deleteItem = useCallback((id: string) => {
    const item = itemsById.get(id)
    dispatch({ type: 'REMOVE_ITEM', payload: id })
    if (item) {
      analytics.trackItemRemoved(item.method)
      toast({ title: "Item deleted", duration: TIMING.TOAST_SHORT })
    }
  }, [itemsById, dispatch, analytics, toast])

  const confirmNewBill = useCallback(() => {
    dispatch({ type: 'NEW_BILL' })
    toast({ title: "New bill created", variant: "success" })
    analytics.trackBillCreated()
    analytics.trackFeatureUsed(
      newBillSourceRef.current === "shortcut" ? "keyboard_shortcut_new_bill" : "new_bill"
    )
    newBillSourceRef.current = "button"
    setIsNewBillDialogOpen(false)
  }, [dispatch, toast, analytics])

  const openDeleteDialog = useCallback((item: Item) => {
    setPendingDeleteItem(item)
    setIsDeleteDialogOpen(true)
  }, [])

  const confirmDeleteItem = useCallback(() => {
    if (!pendingDeleteItem) return
    deleteItem(pendingDeleteItem.id)
    setPendingDeleteItem(null)
    setIsDeleteDialogOpen(false)
  }, [pendingDeleteItem, deleteItem])

  const duplicateItem = useCallback((item: Item) => {
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
  }, [dispatch, analytics, toast])

  const handleScanImport = useCallback((scannedItems: Omit<Item, 'id' | 'splitWith' | 'method'>[]) => {
    scannedItems.forEach(item => {
      const newItem: Omit<Item, 'id'> = {
        ...item,
        splitWith: people.map(p => p.id), // Default split with everyone
        method: 'even'
      }
      dispatch({ type: 'ADD_ITEM', payload: newItem })
    })
    analytics.trackFeatureUsed("scan_receipt_import", { count: scannedItems.length })
  }, [people, dispatch, analytics])

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

  const updatePerson = useCallback((updatedPerson: Person) => {
    dispatch({
      type: 'UPDATE_PERSON',
      payload: updatedPerson
    })
    toast({
      title: "Person updated",
      description: `${updatedPerson.name}'s details have been updated`,
      variant: "success",
    })
    analytics.trackFeatureUsed("update_person")
    setEditingPerson(null)
  }, [dispatch, toast, analytics])

  const removePerson = useCallback((personId: string) => {
    const person = peopleById.get(personId)
    const hadItems = items.some(i => i.splitWith.includes(personId))
    dispatch({ type: 'REMOVE_PERSON', payload: personId })
    if (person) {
      analytics.trackPersonRemoved(hadItems)
      toast({ title: "Person removed", description: person.name })
    }
    setEditingPerson(null)
  }, [peopleById, items, dispatch, analytics, toast])

  const openRemovePersonDialog = useCallback((person: Person) => {
    setPendingRemovePerson(person)
    setIsRemovePersonDialogOpen(true)
  }, [])

  const confirmRemovePerson = useCallback(() => {
    if (!pendingRemovePerson) return
    removePerson(pendingRemovePerson.id)
    setPendingRemovePerson(null)
    setIsRemovePersonDialogOpen(false)
  }, [pendingRemovePerson, removePerson])

  function handleUndo(): void {
    dispatch({ type: 'UNDO' })
    toast({ title: "Undone", duration: TIMING.TOAST_SHORT })
    analytics.trackUndoRedoUsed("undo", state.historyIndex)
  }

  function handleRedo(): void {
    dispatch({ type: 'REDO' })
    toast({ title: "Redone", duration: TIMING.TOAST_SHORT })
    analytics.trackUndoRedoUsed("redo", state.historyIndex)
  }

  function openNewBillDialog(): void {
    newBillSourceRef.current = "button"
    setIsNewBillDialogOpen(true)
  }

  // --- Split Method Management ---
  const getSplitMethodIcon = (method: SplitMethod) => {
    const option = splitMethodOptions.find(o => o.value === method)
    return option?.icon || Users
  }

  const changeSplitMethod = useCallback((itemId: string, newMethod: SplitMethod) => {
    const item = itemsById.get(itemId)
    if (!item) return

    const oldMethod = item.method
    updateItem(itemId, { method: newMethod })
    analytics.trackSplitMethodChanged(itemId, oldMethod, newMethod, item.splitWith.length)
    toast({
      title: "Split method changed",
      description: `Changed to ${splitMethodOptions.find(o => o.value === newMethod)?.label}`,
      duration: TIMING.TOAST_SHORT
    })
  }, [itemsById, updateItem, analytics, toast])

  // --- Bill ID Loading ---
  const handleLoadBill = useCallback(async () => {
    const trimmedId = billId.trim()
    if (!trimmedId) {
      setLoadBillError("Paste a bill ID or link to load.")
      return
    }

    // Create unique request ID to prevent race conditions
    const requestId = `${Date.now()}-${Math.random()}`
    loadBillRequestRef.current = requestId

    setIsLoadingBill(true)
    setLoadBillError(null)
    analytics.trackFeatureUsed("load_bill_by_id", { bill_id: trimmedId })

    try {
      const result = await getBillFromCloud(trimmedId)

      // Check if this request is still current
      if (loadBillRequestRef.current !== requestId) {
        return
      }

      if (result.error || !result.bill) {
        setLoadBillError(result.error || "We couldn't find that bill. Double-check the ID and try again.")
        analytics.trackError("load_bill_failed", result.error || "Bill not found")
        return
      }

      const migratedBill = migrateBillSchema(result.bill)
      dispatch({ type: 'LOAD_BILL', payload: migratedBill })
      toast({
        title: "Bill loaded!",
        description: `Loaded "${migratedBill.title}"`,
        variant: "success",
      })
      analytics.trackSharedBillLoaded("cloud")
      setBillId('') // Clear input after successful load
      setLoadBillError(null)
    } catch (error) {
      // Only show error if this request is still current
      if (loadBillRequestRef.current === requestId) {
        setLoadBillError(
          error instanceof Error
            ? error.message
            : "Something went wrong. Check your connection and try again."
        )
        analytics.trackError("load_bill_failed", error instanceof Error ? error.message : "Unknown error")
      }
    } finally {
      // Only clear loading state if this request is still current
      if (loadBillRequestRef.current === requestId) {
        setIsLoadingBill(false)
      }
    }
  }, [billId, dispatch, toast, analytics])

  // --- Copy Breakdown ---
  const copyBreakdown = useCallback(async () => {
    if (people.length === 0) {
      setCopyError("Add people and items before copying a summary.")
      analytics.trackError("copy_summary_failed", "No data to copy")
      return
    }

    const text = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(text)
    if (success) {
      setCopyError(null)
      toast({
        title: "Copied!",
        description: "Bill summary copied to clipboard",
        variant: "success",
      })
      analytics.trackBillSummaryCopied()
      analytics.trackFeatureUsed("copy_summary")
    } else {
      setCopyError("Clipboard access is blocked. Use the Share button to export instead.")
      analytics.trackError("copy_summary_failed", "Clipboard API failed")
    }
  }, [people, state.currentBill, toast, analytics])

  // --- Stable Grid Cell Callbacks (for performance) ---
  const handleCellEdit = useCallback((itemId: string, field: 'name' | 'price' | 'qty', value: string) => {
    if (field === 'name') {
      updateItem(itemId, { name: value })
    } else if (field === 'price') {
      updateItem(itemId, { price: value })
    } else if (field === 'qty') {
      const parsed = parseInt(value, 10)
      updateItem(itemId, { quantity: value === '' ? 0 : (isNaN(parsed) ? 0 : parsed) })
    }
  }, [updateItem])

  const handleCellClick = useCallback((row: number, col: string) => {
    // Special case: person assignment cells always single-click toggle
    if (people.some(p => p.id === col)) {
      const item = items[row]
      if (item) toggleAssignment(item.id, col)
      return
    }

    setSelectedCell({ row, col })
    setEditing(true)
  }, [people, items, toggleAssignment])

  // --- Global Keyboard Shortcuts & Grid Navigation ---
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if we're in an input field - comprehensive check
    const target = e.target as HTMLElement
    const activeElement = document.activeElement as HTMLElement

    const hotkeyState = hotkeyStateRef.current
    const hotkeyActions = hotkeyActionsRef.current

    const isInInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.contentEditable === 'true' ||
      target.isContentEditable ||
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.tagName === 'SELECT' ||
      activeElement?.contentEditable === 'true' ||
      activeElement?.isContentEditable ||
      (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null)

    const editableCols = ['name', 'price', 'qty']
    const isEditableCell = editableCols.includes(hotkeyState.selectedCell.col)

    const colOrder = ['name', 'price', 'qty', ...hotkeyState.people.map(p => p.id)]
    const currentColIdx = colOrder.indexOf(hotkeyState.selectedCell.col)
    const currentRowIdx = hotkeyState.selectedCell.row

    const commitAndMove = (direction: 'down' | 'up' | 'right' | 'left') => {
      let nextRow = currentRowIdx
      let nextColIdx = currentColIdx

      if (direction === 'down') {
        if (currentRowIdx < hotkeyState.items.length - 1) nextRow += 1
      } else if (direction === 'up') {
        if (currentRowIdx > 0) nextRow -= 1
      } else if (direction === 'right') {
        if (currentColIdx < colOrder.length - 1) {
          nextColIdx += 1
        } else if (currentRowIdx < hotkeyState.items.length - 1) {
          nextRow += 1
          nextColIdx = 0
        }
      } else if (direction === 'left') {
        if (currentColIdx > 0) {
          nextColIdx -= 1
        } else if (currentRowIdx > 0) {
          nextRow -= 1
          nextColIdx = colOrder.length - 1
        }
      }

      setSelectedCell({ row: nextRow, col: colOrder[nextColIdx] })
      hotkeyActions.stopEditing()
    }

    const startTypingEdit = (initialValue: string) => {
      if (!isEditableCell) return
      const item = hotkeyState.items[currentRowIdx]
      if (!item) return
      if (hotkeyState.selectedCell.col === 'name') hotkeyActions.updateItem(item.id, { name: initialValue })
      if (hotkeyState.selectedCell.col === 'price') hotkeyActions.updateItem(item.id, { price: initialValue })
      if (hotkeyState.selectedCell.col === 'qty') {
        const parsed = parseInt(initialValue, 10)
        hotkeyActions.updateItem(item.id, { quantity: initialValue === '' ? 0 : (isNaN(parsed) ? 0 : parsed) })
      }
      setEditing(true)
    }

    const isPrintableKey = e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey

    // Escape key - close modals, menus, and exit edit mode
    if (e.key === 'Escape') {
      if (hotkeyState.editingPerson) {
        hotkeyActions.closeEditingPerson()
        e.preventDefault()
        return
      }
      if (hotkeyState.editing) {
        hotkeyActions.stopEditing()
        e.preventDefault()
        return
      }
    }

    // If currently editing a cell input, let typing happen but keep spreadsheet commits
    if (hotkeyState.editing && isInInput) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          commitAndMove('up')
        } else {
          // At last row, add a new one and move
          if (currentRowIdx >= hotkeyState.items.length - 1) {
            hotkeyActions.addItem()
            setSelectedCell({ row: hotkeyState.items.length, col: hotkeyState.selectedCell.col })
          } else {
            commitAndMove('down')
          }
        }
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          commitAndMove('left')
        } else {
          commitAndMove('right')
        }
        return
      }
      // Allow arrows/backspace/etc to behave normally inside the input
      return
    }

    // Global shortcuts (only when not typing in other inputs)
    if (!isInInput) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        hotkeyActions.dispatchUndo()
        hotkeyActions.toastUndo()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        hotkeyActions.dispatchRedo()
        hotkeyActions.toastRedo()
        return
      }

      // Cmd+N: New bill
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        newBillSourceRef.current = "shortcut"
        setIsNewBillDialogOpen(true)
        return
      }

      // Cmd+Shift+N: Add new item
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        hotkeyActions.addItem()
        analytics.trackFeatureUsed("keyboard_shortcut_add_item")
        return
      }

      // Cmd+Shift+P: Add person
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        hotkeyActions.addPerson()
        analytics.trackFeatureUsed("keyboard_shortcut_add_person")
        return
      }

      // Cmd+Shift+C: Copy summary
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        hotkeyActions.copyBreakdown()
        analytics.trackFeatureUsed("keyboard_shortcut_copy")
        return
      }

      // Cmd+S: Share
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        const shareButton = document.querySelector('[data-share-trigger]') as HTMLButtonElement
        if (shareButton) shareButton.click()
        analytics.trackFeatureUsed("keyboard_shortcut_share")
        return
      }
    }

    // Grid navigation - Excel-like behavior
    if (hotkeyState.activeView !== 'ledger') return

    // Type-to-edit from selection
    if (!hotkeyState.editing && isEditableCell && (isPrintableKey || e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault()
      const seed = (e.key === 'Backspace' || e.key === 'Delete') ? '' : e.key
      startTypingEdit(seed)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        commitAndMove('left')
      } else {
        commitAndMove('right')
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        commitAndMove('up')
      } else {
        if (currentRowIdx >= hotkeyState.items.length - 1) {
          hotkeyActions.addItem()
          setSelectedCell({ row: hotkeyState.items.length, col: hotkeyState.selectedCell.col })
        } else {
          commitAndMove('down')
        }
      }
      return
    }

    if (e.key.startsWith('Arrow')) {
      e.preventDefault()
      let newColIdx = currentColIdx
      let newRowIdx = currentRowIdx

      if (e.key === 'ArrowRight' && currentColIdx < colOrder.length - 1) newColIdx++
      if (e.key === 'ArrowLeft' && currentColIdx > 0) newColIdx--
      if (e.key === 'ArrowDown' && currentRowIdx < hotkeyState.items.length - 1) newRowIdx++
      if (e.key === 'ArrowUp' && currentRowIdx > 0) newRowIdx--

      setSelectedCell({ row: newRowIdx, col: colOrder[newColIdx] })
      hotkeyActions.stopEditing()
      return
    }

    // Toggle assignment with space when on person cells
    if (e.key === ' ' && hotkeyState.people.some(p => p.id === hotkeyState.selectedCell.col)) {
      e.preventDefault()
      const item = hotkeyState.items[hotkeyState.selectedCell.row]
      if (item) hotkeyActions.toggleAssignment(item.id, hotkeyState.selectedCell.col)
      return
    }
  }, [analytics])

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  useEffect(() => {
    hotkeyStateRef.current = {
      activeView,
      editing,
      selectedCell,
      items,
      people,
      editingPerson,
      historyIndex: state.historyIndex,
    }
  }, [activeView, editing, selectedCell, items, people, editingPerson, state.historyIndex])

  useEffect(() => {
    hotkeyActionsRef.current = {
      addItem,
      addPerson,
      copyBreakdown,
      toggleAssignment,
      updateItem,
      dispatchUndo: () => {
        dispatch({ type: 'UNDO' })
        analytics.trackUndoRedoUsed("undo", state.historyIndex)
      },
      dispatchRedo: () => {
        dispatch({ type: 'REDO' })
        analytics.trackUndoRedoUsed("redo", state.historyIndex)
      },
      toastUndo: () => toast({ title: "Undo", duration: TIMING.TOAST_SHORT }),
      toastRedo: () => toast({ title: "Redo", duration: TIMING.TOAST_SHORT }),
      closeEditingPerson: () => setEditingPerson(null),
      stopEditing: () => setEditing(false),
    }
  }, [
    addItem,
    addPerson,
    copyBreakdown,
    toggleAssignment,
    updateItem,
    dispatch,
    toast,
    analytics,
    state.historyIndex,
  ])

  useEffect(() => {
    const saved = window.localStorage.getItem('splitsimple_hide_starter')
    if (saved === '1') setHideStarter(true)
  }, [])

  useEffect(() => {
    setActiveView(normalizedView)
  }, [normalizedView])

  // Seed a first row when empty so the grid is immediately ready to type.
  useLayoutEffect(() => {
    if (activeView !== 'ledger') return
    if (items.length !== 0) return
    addItem()
  }, [activeView, items.length, addItem])

  // When the first row appears, focus and enter edit mode on the item name cell.
  useEffect(() => {
    const prevLen = previousItemsLengthRef.current
    previousItemsLengthRef.current = items.length

    if (activeView !== 'ledger') return
    if (prevLen === 0 && items.length === 1) {
      setSelectedCell({ row: 0, col: 'name' })
      setEditing(true)
    }
  }, [activeView, items.length])

  useEffect(() => {
    if (editing && editInputRef.current) {
      const input = editInputRef.current
      input.focus()
      // Select all so first keystroke replaces existing placeholder values
      requestAnimationFrame(() => {
        input.select()
      })
    }
  }, [editing])

  return (
    <div className="pro-app-shell selection:bg-primary/15 selection:text-primary">
      {/* --- Header --- */}
      <header className="pro-header">
        <div className="w-full flex items-center justify-between gap-6">
          {/* Left cluster: Brand + Title + Sync */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <SplitSimpleIcon />
              <div className="min-w-0">
                <input
                  value={title}
                  onChange={(e) => {
                    dispatch({ type: 'SET_BILL_TITLE', payload: e.target.value })
                    analytics.trackTitleChanged(e.target.value)
                  }}
                  style={{
                    width: `${Math.min(Math.max((title || '').length || 7, 7), 26)}ch`,
                  }}
                  className={cn(
                    "block text-sm font-bold bg-transparent border-none p-0 focus:ring-0 text-foreground w-auto min-w-[7ch] max-w-[26ch] hover:text-primary transition-colors font-sans",
                    focusRingClass
                  )}
                  placeholder="Project name…"
                  aria-label="Bill title"
                  name="bill-title"
                  autoComplete="off"
                />
                <div className="text-[10px] font-medium text-muted-foreground mt-0.5">SPLIT SIMPLE</div>
              </div>
            </div>

          </div>

          {/* Center: View switcher */}
          <div className="hidden md:flex items-center gap-2 bg-muted p-1 rounded-md">
            <button
              onClick={() => setView('ledger')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-2 font-sans",
                focusRingClass,
                activeView === 'ledger' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GridIcon size={14} /> Ledger
            </button>
            <button
              onClick={() => setView('breakdown')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-2 font-sans",
                focusRingClass,
                activeView === 'breakdown' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText size={14} /> Breakdown
            </button>
          </div>

          {/* Right cluster: History + Primary actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted border border-border/60 rounded-md px-1.5 py-1 shadow-sm">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                aria-label="Undo"
                className={cn(
                  "p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                  focusRingClass
                )}
                title="Undo (Cmd+Z)"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                aria-label="Redo"
                className={cn(
                  "p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                  focusRingClass
                )}
                title="Redo (Cmd+Shift+Z)"
              >
                <RotateCw size={16} />
              </button>
            </div>

            <div className="flex items-center bg-muted border border-border/60 rounded-md overflow-hidden shadow-sm">
              <button
                onClick={openNewBillDialog}
                className={cn(
                  "h-8 px-3 hover:bg-muted-foreground/15 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 font-sans",
                  focusRingClass
                )}
                title="New Bill (Cmd+N)"
              >
                <FileQuestion size={14} />
                <span>New</span>
              </button>
              <div className="h-6 w-px bg-muted-foreground/15/80" />

            <DropdownMenu
              open={newLoadDropdownOpen}
              onOpenChange={(open) => {
                setNewLoadDropdownOpen(open)
                if (!open) setLoadBillError(null)
              }}
            >
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "h-8 px-3 hover:bg-muted-foreground/15 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 font-sans",
                  focusRingClass
                )}>
                  <Search size={14} />
                  <span>Load</span>
                  <ChevronDown size={12} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <label htmlFor="bill-id-input" className="text-xs text-muted-foreground font-medium">
                    Enter Bill ID:
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                      <input
                        id="bill-id-input"
                        type="text"
                        value={billId}
                        name="bill-id"
                        autoComplete="off"
                        onChange={(e) => {
                          setBillId(e.target.value)
                          if (loadBillError) setLoadBillError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && billId.trim()) {
                            handleLoadBill()
                            setNewLoadDropdownOpen(false)
                          }
                          if (e.key === 'Escape') {
                            setNewLoadDropdownOpen(false)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="ABC123…"
                        disabled={isLoadingBill}
                        className={cn(
                          "w-full h-8 pl-7 pr-2 bg-muted border border-border rounded-md text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-card transition-colors disabled:opacity-50 font-mono",
                          focusRingClass
                        )}
                      />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setNewLoadDropdownOpen(false)
                        setBillId('')
                        setLoadBillError(null)
                      }}
                      className="flex-1 h-7 px-2 bg-muted hover:bg-muted-foreground/15 rounded text-xs font-medium text-muted-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLoadBill()
                        setNewLoadDropdownOpen(false)
                      }}
                      disabled={isLoadingBill || !billId.trim()}
                      className={cn(
                        "flex-1 h-7 px-2 bg-primary hover:bg-primary/90 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1",
                        focusRingClass
                      )}
                    >
                      {isLoadingBill ? 'Loading…' : 'Load'}
                    </button>
                  </div>
                  {loadBillError && (
                    <p className="text-[11px] text-red-600" role="alert">
                      {loadBillError}
                    </p>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-6 w-px bg-muted-foreground/15/80" />

            <ReceiptScanner
              onImport={handleScanImport}
              trigger={(
                <button
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted-foreground/15/60 transition-colors",
                    focusRingClass
                  )}
                  title="Scan receipt"
                >
                  <Camera size={14} />
                  <span className="whitespace-nowrap">Scan Receipt</span>
                </button>
              )}
            />
            <div className="h-6 w-px bg-muted-foreground/15/80" />

            <div className="flex flex-col items-start">
              <button
                onClick={copyBreakdown}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary hover:text-primary/90 hover:bg-primary/10 transition-colors",
                  focusRingClass
                )}
                title="Copy summary to clipboard (Cmd+Shift+C)"
              >
                <ClipboardCopy size={14} /> Copy Summary
              </button>
              {copyError && (
                <span className="mt-1 text-[10px] text-red-600" role="alert">
                  {copyError}
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-muted-foreground/15/80" />
            {/* The single orange "money moment" on the page.
                Uses descendant selectors to recolor the ShareBill trigger button
                without touching ShareBill itself. */}
            <div className="px-1 [&_button]:!bg-cta [&_button]:!text-cta-foreground [&_button]:!border-0 [&_button]:hover:!bg-cta-hover [&_button]:active:!scale-[0.97] [&_button]:!font-bold [&_button]:!transition-transform [&_button]:!duration-100">
              <ShareBill variant="default" size="sm" showText={true} />
            </div>
          </div>
          </div>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main id="main-content" className="pro-main">
        {/* LEDGER VIEW */}
        {activeView === 'ledger' && (
          <div className="h-full w-full">
            <div
              className="h-full overflow-auto px-6 py-6 outline-none pro-scrollbar"
              tabIndex={-1}
            >
              <div className="mx-auto w-full max-w-7xl">
                <div className="grid grid-cols-12 gap-6">
                  <section className="col-span-12 xl:col-span-9">
                    <div className="bg-card rounded-xl border-2 border-border overflow-hidden">
                      <div className="px-5 py-4 border-b border-border/80 bg-primary/5">
                        <h2 className="text-base font-semibold text-foreground text-balance font-sans">Items & split</h2>
                        <p className="text-xs text-muted-foreground text-pretty font-sans">
                          Add items, set prices, and assign people to split each line.
                        </p>
                      </div>

                      {/* Sticky toolbar */}
                      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-card/95 backdrop-blur border-b border-border/80">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={addItem}
                            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-bold flex items-center gap-2 transition-transform active:scale-[0.97]"
                            title="Add new line item (Cmd+Shift+N)"
                          >
                            <Plus size={14} /> Add Line Item
                          </button>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted border border-border text-muted-foreground">
                              <Equal size={11} className="text-primary" /> Split
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted border border-border text-muted-foreground">
                              <Users size={11} className="text-primary" /> People
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-sans">
                          <span className="px-2 py-1 rounded bg-muted border border-border">Tab/Enter to commit</span>
                          <span className="px-2 py-1 rounded bg-muted border border-border">Esc to exit</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <div
                          className="min-w-max"
                          role="grid"
                          aria-rowcount={calculatedItems.length}
                          aria-colcount={4 + people.length + 1}
                        >
                          {/* Sticky Header */}
                          <div className="pro-grid-header flex text-[10px] font-bold text-muted-foreground uppercase">
                            <div className="w-12 p-3 text-center border-r border-border/40 flex items-center justify-center">#</div>
                            <div className="w-48 xl:w-72 p-3 border-r border-border/40 flex items-center pro-sticky-left">Item Description</div>
                            <div className="w-28 p-3 text-right border-r border-border/40 flex items-center justify-end">Price</div>
                            <div className="w-20 p-3 text-center border-r border-border/40 flex items-center justify-center">Qty</div>

                            {people.map(p => {
                              const colorObj = COLORS[p.colorIdx || 0]
                              const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              return (
                                  <button
                                    key={p.id}
                                  className="group/person w-28 p-2 border-r border-border/40 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors relative"
                                  onClick={() => setEditingPerson(p)}
                                    aria-label={`Edit ${p.name}`}
                                    title={`Click to edit ${p.name}`}
                                    type="button"
                                  >
                                  <div className={cn(
                                    "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white mb-1",
                                    colorObj.solid
                                  )}>
                                    {initials}
                                  </div>
                                  <span className="text-[9px] truncate max-w-full font-bold text-foreground font-sans">
                                    {p.name.split(' ')[0]}
                                  </span>
                                  <Pencil
                                    size={10}
                                    className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover/person:opacity-100 transition-opacity"
                                    aria-hidden="true"
                                  />
                                </button>
                              )
                            })}

                                  <button
                                    onClick={addPerson}
                                    aria-label="Add person"
                                    className="w-12 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Plus size={16} />
                                  </button>
                            <div className="w-28 p-3 text-right flex items-center justify-end border-l border-border pro-sticky-right">
                              Total
                            </div>
                          </div>

                          {/* Body */}
                          <div className="divide-y divide-border/50">
                            {calculatedItems.length === 0 && (
                              <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                  <Plus className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-2 font-sans text-balance">No items yet</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-sm font-sans text-pretty">
                                  Add your first item to start splitting the bill. Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-bold">{modKey}{shiftKey}N</kbd> or click the button below.
                                </p>
                                <button
                                  onClick={addItem}
                                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition-transform active:scale-[0.97] flex items-center gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add First Item
                                </button>
                              </div>
                            )}

                            {calculatedItems.map((item, rIdx) => (
                              <ContextMenu key={item.id}>
                                <ContextMenuTrigger asChild>
                                  <div className="flex group hover:bg-muted/50 transition-colors h-12 text-sm" role="row" aria-rowindex={rIdx + 1} style={{ contentVisibility: 'auto', containIntrinsicBlockSize: '48px' }}>
                                {/* Index / "Equal" Button */}
                                <div className="w-12 border-r border-border/40 flex items-center justify-center text-[10px] text-muted-foreground/50 font-mono select-none bg-muted/30 group-hover:bg-card transition-colors tabular-nums">
                                  <span className="group-hover:hidden">{String(rIdx + 1).padStart(2, '0')}</span>
                                  <button
                                    onClick={() => toggleAllAssignments(item.id)}
                                    aria-label="Split equally"
                                    className="hidden group-hover:flex w-full h-full items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                                    title="Split Equally"
                                  >
                                    <Equal size={14} strokeWidth={3} />
                                  </button>
                                </div>

                                {/* Name + Split Method Selector */}
                                <div className="w-48 xl:w-72 border-r border-border/40 pro-sticky-left group-hover:bg-muted transition-colors relative p-0 flex items-center">
                                  <div className="flex-1">
                                    <GridCell
                                      row={rIdx}
                                      col="name"
                                      value={item.name}
                                      className="text-foreground font-medium bg-transparent font-sans"
                                      isSelected={selectedCell.row === rIdx && selectedCell.col === 'name'}
                                      isEditing={editing && selectedCell.row === rIdx && selectedCell.col === 'name'}
                                      itemId={item.id}
                                      field="name"
                                      onCellEdit={handleCellEdit}
                                      onCellClick={handleCellClick}
                                      editInputRef={editInputRef}
                                    />
                                  </div>
                                  <div className="relative pr-2">
                                    <DropdownMenu modal={false}>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label="Change split method"
                                          className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                          title="Change split method"
                                        >
                                          {React.createElement(getSplitMethodIcon(item.method), { size: 12 })}
                                          <ChevronDown size={10} />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-40">
                                        {splitMethodOptions.map(option => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onSelect={(e) => {
                                          e.preventDefault()
                                          changeSplitMethod(item.id, option.value)
                                        }}
                                        className={cn(
                                          "text-xs flex items-center gap-2 font-sans",
                                          item.method === option.value ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"
                                        )}
                                      >
                                            {React.createElement(option.icon, { size: 12 })}
                                            {option.label}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {/* Price */}
                                <div className="w-28 border-r border-border/40 relative p-0">
                                  <GridCell
                                    row={rIdx}
                                    col="price"
                                    value={item.price}
                                    type="number"
                                    className="text-right font-mono text-muted-foreground bg-muted/30 tabular-nums"
                                    isSelected={selectedCell.row === rIdx && selectedCell.col === 'price'}
                                    isEditing={editing && selectedCell.row === rIdx && selectedCell.col === 'price'}
                                    itemId={item.id}
                                    field="price"
                                    onCellEdit={handleCellEdit}
                                    onCellClick={handleCellClick}
                                    editInputRef={editInputRef}
                                  />
                                </div>

                                {/* Qty */}
                                <div className="w-20 border-r border-border/40 relative p-0">
                                  <GridCell
                                    row={rIdx}
                                    col="qty"
                                    value={item.qty}
                                    type="number"
                                    className="text-center font-mono text-muted-foreground bg-muted/30 tabular-nums"
                                    isSelected={selectedCell.row === rIdx && selectedCell.col === 'qty'}
                                    isEditing={editing && selectedCell.row === rIdx && selectedCell.col === 'qty'}
                                    itemId={item.id}
                                    field="qty"
                                    onCellEdit={handleCellEdit}
                                    onCellClick={handleCellClick}
                                    editInputRef={editInputRef}
                                  />
                                </div>

                                {/* Person Cells (The "Cards") */}
                                {people.map(p => {
                                  const isAssigned = item.splitWith.includes(p.id)
                                  const isSelected = selectedCell.row === rIdx && selectedCell.col === p.id
                                  const color = COLORS[p.colorIdx || 0]

                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedCell({ row: rIdx, col: p.id })
                                        toggleAssignment(item.id, p.id)
                                      }}
                                      aria-pressed={isAssigned}
                                      aria-label={`Toggle ${p.name} for ${item.name || 'this item'}`}
                                      className={cn(
                                        "w-28 border-r border-border/40 relative cursor-pointer flex items-center justify-center transition-colors duration-100 select-none hover:bg-muted active:bg-muted",
                                        isSelected && "ring-inset ring-2 ring-primary z-10"
                                      )}
                                    >
                                      {isAssigned ? (
                                        <div
                                          className={cn(
                                            "w-20 py-1.5 rounded-md shadow-sm text-center transform transition-transform active:scale-95",
                                            color.solid,
                                            color.textSolid
                                          )}
                                        >
                                          <span className="font-mono text-xs font-bold tabular-nums">
                                            ${(item.pricePerPerson || 0).toFixed(2)}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground font-mono text-sm font-bold opacity-50 select-none">
                                          -
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}

                                {/* Inline actions */}
                                <div className="w-16 border-r border-border/40 flex items-center justify-center gap-2 bg-card">
                                  <button
                                    onClick={() => duplicateItem(item)}
                                    aria-label="Duplicate row"
                                    className={cn(
                                      "size-8 flex items-center justify-center text-muted-foreground/50 hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
                                      focusRingClass
                                    )}
                                    tabIndex={0}
                                    title="Duplicate row"
                                  >
                                    <ClipboardCopy size={12} />
                                  </button>
                                  <button
                                    onClick={() => openDeleteDialog(item)}
                                    aria-label="Delete row"
                                    className={cn(
                                      "size-8 flex items-center justify-center text-muted-foreground/50 hover:text-red-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
                                      focusRingClass
                                    )}
                                    tabIndex={0}
                                    title="Delete row"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>

                                {/* Row Total */}
                                <div className="w-28 pro-sticky-right border-l border-border flex items-center justify-end px-4 group-hover:bg-muted font-mono text-xs font-bold text-foreground tabular-nums">
                                  ${(item.totalItemPrice || 0).toFixed(2)}
                                </div>
                                  </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    onSelect={() => duplicateItem(item)}
                                  >
                                    <ClipboardCopy size={14} /> Duplicate item
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onSelect={() => toggleAllAssignments(item.id)}
                                  >
                                    <Equal size={14} /> Split with everyone
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onSelect={() => clearRowAssignments(item.id)}
                                  >
                                    <Eraser size={14} /> Clear row
                                  </ContextMenuItem>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem
                                    variant="destructive"
                                    onSelect={() => openDeleteDialog(item)}
                                  >
                                    <Trash2 size={14} /> Delete item
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            ))}

                            {/* Add Row Button */}
                            {calculatedItems.length > 0 && (
                              <button
                                onClick={addItem}
                                className="w-full py-2 px-4 text-muted-foreground text-xs font-semibold hover:text-primary hover:bg-muted/80 transition-colors flex items-center justify-start gap-2 border-t border-border font-sans"
                                title="Add new item (Cmd+Shift+N)"
                              >
                                <Plus size={14} /> Add another item
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <aside className="col-span-12 xl:col-span-3 space-y-6 w-full max-w-lg xl:max-w-sm mx-auto xl:justify-self-end xl:mx-0">
                    {!hideStarter && !hasMeaningfulItems && (
                      <div className="rounded-xl border-2 border-border border-t-primary bg-card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground text-balance font-sans">Start splitting in minutes</h3>
                            <p className="text-xs text-muted-foreground text-pretty font-sans">
                              {people.length === 0
                                ? "Add people first, then items. Or scan a receipt to import items instantly."
                                : "Add items to split. Use Tab/Enter to move like a spreadsheet."}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setHideStarter(true)
                              window.localStorage.setItem('splitsimple_hide_starter', '1')
                            }}
                            aria-label="Dismiss getting started"
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            title="Dismiss"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="mt-4 space-y-2">
                          {people.length === 0 ? (
                            <button
                              onClick={addPerson}
                              className="w-full h-9 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-bold text-white transition-transform active:scale-[0.97] flex items-center justify-between"
                            >
                              <span>Add first person</span>
                              <span className="text-primary-foreground/70">{modKey}{shiftKey}P</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (items.length === 0) {
                                  addItem()
                                  return
                                }
                                setSelectedCell({ row: 0, col: 'name' })
                                setEditing(true)
                              }}
                              className="w-full h-9 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-bold text-white transition-transform active:scale-[0.97] flex items-center justify-between"
                            >
                              <span>Add items</span>
                              <span className="text-primary-foreground/70">{modKey}{shiftKey}N</span>
                            </button>
                          )}
                          {people.length === 0 ? (
                            <button
                              onClick={() => {
                                addPerson()
                                if (items.length === 0) {
                                  addItem()
                                }
                              }}
                              className="w-full h-9 px-3 rounded-md bg-muted hover:bg-muted-foreground/15 text-xs font-bold text-foreground transition-colors flex items-center justify-between"
                              title="Adds a person first, then takes you to add items"
                            >
                              <span>Add items</span>
                              <span className="text-muted-foreground">{modKey}{shiftKey}N</span>
                            </button>
                          ) : (
                            <button
                              onClick={addPerson}
                              className="w-full h-9 px-3 rounded-md bg-muted hover:bg-muted-foreground/15 text-xs font-bold text-foreground transition-colors flex items-center justify-between"
                            >
                              <span>Add another person</span>
                              <span className="text-muted-foreground">{modKey}{shiftKey}P</span>
                            </button>
                          )}
                          <ReceiptScanner
                            onImport={handleScanImport}
                            trigger={(
                              <button className="w-full h-9 px-3 rounded-md bg-muted hover:bg-muted-foreground/15 text-xs font-bold text-foreground transition-colors flex items-center gap-2">
                                <Camera size={14} /> Scan receipt to import items
                              </button>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border-2 border-border border-t-primary bg-card p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground text-balance font-sans">People</h3>
                          <p className="text-xs text-muted-foreground text-pretty font-sans">Everyone splitting this bill.</p>
                        </div>
                        <button
                          onClick={addPerson}
                          aria-label="Add person"
                          className="size-8 rounded-md bg-muted hover:bg-muted-foreground/15 text-foreground flex items-center justify-center"
                          title="Add person"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        {people.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground font-sans text-pretty">
                            No people yet. Add someone to start splitting.
                          </div>
                        ) : (
                          people.map(p => {
                            const stats = personFinalShares[p.id]
                            const colorObj = COLORS[p.colorIdx || 0]
                            const percent = stats ? (stats.total / (grandTotal || 1)) * 100 : 0
                            const isExpanded = expandedPeople.has(p.id)
                            return (
                              <div
                                key={p.id}
                                className={cn(
                                  "rounded-lg border border-border/70 hover:border-border transition-colors overflow-hidden",
                                  colorObj.bg
                                )}
                              >
                                <div
                                  onClick={() => togglePersonExpansion(p.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault()
                                      togglePersonExpansion(p.id)
                                    }
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  className="w-full flex items-center justify-between px-3 py-2.5 text-left cursor-pointer"
                                  aria-expanded={isExpanded}
                                  aria-label={`Toggle ${p.name} details`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn("size-3 rounded-full ring-2 ring-card", colorObj.solid)} />
                                    <span className="text-sm font-semibold text-foreground font-sans">{p.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <AnimatedNumber
                                        value={stats?.total || 0}
                                        formatFn={formatCurrencySimple}
                                        className="text-xs font-semibold text-foreground font-mono tabular-nums"
                                        duration={250}
                                      />
                                      <div className="text-[10px] text-muted-foreground font-mono tabular-nums">
                                        {percent.toFixed(0)}%
                                      </div>
                                    </div>
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setEditingPerson(p)
                                      }}
                                      className="size-7 rounded-md border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border flex items-center justify-center"
                                      aria-label={`Edit ${p.name}`}
                                      title={`Edit ${p.name}`}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <ChevronDown
                                      className={cn(
                                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                        isExpanded && "rotate-180"
                                      )}
                                    />
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                                    isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "overflow-hidden px-3 pb-3 pt-0 border-t border-border/50 bg-muted/40 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
                                      isExpanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                                    )}
                                  >
                                    <div className="pt-3 space-y-2">
                                      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground font-mono tabular-nums">
                                        <div className="flex items-center justify-between">
                                          <span>Subtotal</span>
                                          <span className="text-foreground">{formatCurrencySimple(stats?.subtotal || 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Tax</span>
                                          <span className="text-foreground">{formatCurrencySimple(stats?.tax || 0)}</span>
                                        </div>
                                        {stats?.tip ? (
                                          <div className="flex items-center justify-between">
                                            <span>Tip</span>
                                            <span className="text-foreground">{formatCurrencySimple(stats.tip)}</span>
                                          </div>
                                        ) : null}
                                        {stats?.discount ? (
                                          <div className="flex items-center justify-between">
                                            <span>Discount</span>
                                            <span className="text-foreground">-{formatCurrencySimple(stats.discount)}</span>
                                          </div>
                                        ) : null}
                                      </div>

                                      <div className="pt-2 border-t border-border/50 space-y-1">
                                        {stats?.items.length ? (
                                          stats.items.map(item => (
                                            <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                                              <span className="truncate pr-2">
                                                {item.qty > 1
                                                  ? `${item.name || 'Item'} ×${item.qty}`
                                                  : (item.name || 'Item')}
                                              </span>
                                              <span className="font-mono tabular-nums">
                                                {formatCurrencySimple(item.pricePerPerson)}
                                              </span>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-xs text-muted-foreground">No items assigned.</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-border border-t-primary bg-card p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground text-balance font-sans">Bill totals</h3>
                          <p className="text-xs text-muted-foreground text-pretty font-sans">Adjust tax, tip, and discounts.</p>
                        </div>
                        <button
                          onClick={() => {
                            const newAllocation = state.currentBill.taxTipAllocation === 'proportional' ? 'even' : 'proportional'
                            dispatch({ type: 'SET_TAX_TIP_ALLOCATION', payload: newAllocation })
                            toast({
                              title: newAllocation === 'proportional' ? "Tax & tip split by order size" : "Tax & tip split equally",
                              description: newAllocation === 'proportional'
                                ? "Each person pays a share based on what they ordered."
                                : "Each person pays the same share of tax and tip.",
                              duration: TIMING.TOAST_SHORT
                            })
                            analytics.trackFeatureUsed("tax_tip_allocation_toggle", { allocation: newAllocation })
                          }}
                          className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted hover:bg-muted-foreground/15 text-[10px] font-semibold text-muted-foreground"
                          title={
                            state.currentBill.taxTipAllocation === 'proportional'
                              ? "Tax & tip split by what each person ordered. Click to split equally instead."
                              : "Tax & tip split equally per person. Click to split by what each ordered instead."
                          }
                          aria-label={`Tax and tip allocation. Currently splitting ${state.currentBill.taxTipAllocation === 'proportional' ? 'by order size' : 'equally'}. Click to toggle.`}
                        >
                          {state.currentBill.taxTipAllocation === 'proportional' ? (
                            <Scale size={12} className="text-primary" />
                          ) : (
                            <Equal size={12} className="text-primary" />
                          )}
                          {state.currentBill.taxTipAllocation === 'proportional' ? 'By order size' : 'Equal share'}
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-sans">
                        <div className="space-y-1">
                          <label htmlFor="bill-tax" className="text-muted-foreground">Tax</label>
                          <input
                            id="bill-tax"
                            type="text"
                            inputMode="decimal"
                            value={state.currentBill.tax}
                            name="bill-tax"
                            autoComplete="off"
                            onChange={(e) => {
                              dispatch({ type: 'SET_TAX', payload: e.target.value })
                              analytics.trackTaxTipDiscountUsed("tax", e.target.value, state.currentBill.taxTipAllocation)
                            }}
                            className="w-full h-9 rounded-md border border-border bg-card px-2 text-right font-mono text-foreground tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="bill-tip" className="text-muted-foreground">Tip</label>
                          <input
                            id="bill-tip"
                            type="text"
                            inputMode="decimal"
                            value={state.currentBill.tip}
                            name="bill-tip"
                            autoComplete="off"
                            onChange={(e) => {
                              dispatch({ type: 'SET_TIP', payload: e.target.value })
                              analytics.trackTaxTipDiscountUsed("tip", e.target.value, state.currentBill.taxTipAllocation)
                            }}
                            className="w-full h-9 rounded-md border border-border bg-card px-2 text-right font-mono text-foreground tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="bill-discount" className="text-muted-foreground">Discount</label>
                          <input
                            id="bill-discount"
                            type="text"
                            inputMode="decimal"
                            value={state.currentBill.discount}
                            name="bill-discount"
                            autoComplete="off"
                            onChange={(e) => {
                              dispatch({ type: 'SET_DISCOUNT', payload: e.target.value })
                              analytics.trackTaxTipDiscountUsed("discount", e.target.value, state.currentBill.taxTipAllocation)
                            }}
                            className="w-full h-9 rounded-md border border-border bg-card px-2 text-right font-mono text-foreground tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-muted-foreground">Subtotal</label>
                          <div className="h-9 rounded-md border border-border bg-muted px-2 flex items-center justify-end font-mono text-foreground tabular-nums">
                            {formatCurrencySimple(subtotal)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs font-sans">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Tax</span>
                          <span className="font-mono tabular-nums">{formatCurrencySimple(taxAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Tip</span>
                          <span className="font-mono tabular-nums">{formatCurrencySimple(tipAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Discount</span>
                          <span className="font-mono tabular-nums">-{formatCurrencySimple(discountAmount)}</span>
                        </div>
                        <div className="flex items-baseline justify-between border-t-2 border-foreground pt-3 mt-2">
                          <span className="text-lg font-bold text-foreground">Total</span>
                          <AnimatedNumber
                            value={grandTotal}
                            formatFn={formatCurrencySimple}
                            className="text-2xl font-bold font-mono tabular-nums text-foreground"
                            duration={300}
                          />
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BREAKDOWN VIEW */}
        {activeView === 'breakdown' && (
          <ProBillBreakdownView
            calculatedItems={calculatedItems}
            colors={COLORS}
            formatCurrency={formatCurrencySimple}
            grandTotal={grandTotal}
            people={people}
            personFinalShares={personFinalShares}
            subtotal={subtotal}
            taxAmount={taxAmount}
            tipAmount={tipAmount}
            title={title}
          />
        )}
      </main>

      <AlertDialog open={isNewBillDialogOpen} onOpenChange={setIsNewBillDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current bill will be cleared unless you share it first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNewBill}>Start new bill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setPendingDeleteItem(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteItem(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem}>Delete item</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isRemovePersonDialogOpen}
        onOpenChange={(open) => {
          setIsRemovePersonDialogOpen(open)
          if (!open) setPendingRemovePerson(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this person?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemovePerson?.name || "This person"} will be removed from the bill and their splits cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRemovePerson(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemovePerson}>Remove person</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Footer --- */}
      <footer className="pro-footer">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1.5 text-[10px] text-muted-foreground font-sans">
            <span className="font-semibold text-foreground tabular-nums">{items.length}</span>
            <span>items</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="font-semibold text-foreground tabular-nums">{people.length}</span>
            <span>people</span>
            <span className="text-muted-foreground/50">•</span>
            <SyncStatusIndicator inline />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <div className="flex bg-muted p-1 rounded-md">
              <button
                onClick={() => setView('ledger')}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-2 font-sans",
                  focusRingClass,
                  activeView === 'ledger' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <GridIcon size={14} /> Ledger
              </button>
              <button
                onClick={() => setView('breakdown')}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-2 font-sans",
                  focusRingClass,
                  activeView === 'breakdown' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText size={14} /> Breakdown
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-sans">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold" title="New item">{modKey}{shiftKey}N</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold" title="Add person">{modKey}{shiftKey}P</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold" title="Copy summary">{modKey}{shiftKey}C</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold" title="Share">{modKey}S</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold" title="Undo">{modKey}Z</kbd>
            </div>
            <span className="text-muted-foreground/50">•</span>
            <a
              href="https://anuragd.me"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-medium text-muted-foreground hover:text-muted-foreground transition-colors font-sans"
            >
              Anurag Dhungana
            </a>
          </div>
        </div>
      </footer>

      {/* --- Person Editor Modal --- */}
      <Dialog open={!!editingPerson} onOpenChange={(open) => !open && setEditingPerson(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          {editingPerson && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 font-sans">
                  Display Name
                </label>
                <input
                  autoFocus
                  value={editingPerson.name}
                  onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-3 font-sans">
                  Color Theme
                </label>
                <div className="flex gap-3 flex-wrap">
                  {COLORS.map((c, idx) => {
                    const colorLabel = c.id.charAt(0).toUpperCase() + c.id.slice(1)
                    return (
                      <button
                        key={idx}
                        onClick={() => setEditingPerson({ ...editingPerson, colorIdx: idx, color: c.hex })}
                        aria-label={`Select ${colorLabel} color`}
                        title={colorLabel}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110",
                          c.solid,
                          editingPerson.colorIdx === idx && "ring-2 ring-offset-2 ring-muted-foreground scale-110"
                        )}
                      />
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex gap-3">
                <button
                  onClick={() => openRemovePersonDialog(editingPerson)}
                  className="flex-1 py-2.5 rounded-lg border border-red-100 text-red-600 text-xs font-bold uppercase hover:bg-red-50 transition-colors font-sans"
                >
                  Remove
                </button>
                <button
                  onClick={() => updatePerson(editingPerson)}
                  className="flex-[2] py-2.5 rounded-lg bg-foreground text-background text-xs font-bold uppercase hover:bg-foreground/90 transition-colors shadow-lg shadow-foreground/20 font-sans"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ProBillSplitter() {
  const isMobileView = useIsMobile()
  if (isMobileView) {
    return <MobileSpreadsheetView />
  }
  return <DesktopBillSplitter />
}
