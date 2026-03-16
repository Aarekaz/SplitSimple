"use client"

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
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
  ChevronDown,
  Camera,
  Pencil,
  Users,
  Scale,
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
import { PERSON_COLORS, SPLIT_METHOD_OPTIONS, formatCurrency } from '@/lib/design-tokens'
import type { SplitMethod } from '@/lib/design-tokens'
import { SplitSimpleIcon } from '@/components/SplitSimpleIcon'
import { GridCell } from '@/components/GridCell'
import { useBillCalculations } from '@/hooks/use-bill-calculations'

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

// COLORS, SplitMethod, SplitSimpleIcon, GridCell, formatCurrency — imported from extracted modules
const COLORS = PERSON_COLORS
const formatCurrencySimple = formatCurrency

const ReceiptScanner = dynamic(
  () => import('@/components/ReceiptScanner').then((mod) => mod.ReceiptScanner),
  { ssr: false }
)

const ProBillBreakdownView = dynamic(
  () => import('@/components/ProBillBreakdownView'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full overflow-auto p-6 bg-muted/50 overflow-auto">
        <div className="max-w-5xl mx-auto text-sm text-muted-foreground">Loading breakdown…</div>
      </div>
    ),
  }
)

// GridCell — imported from @/components/GridCell





const splitMethodOptions = SPLIT_METHOD_OPTIONS

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
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const [isLoadingBill, setIsLoadingBill] = useState(false)
  const [newLoadDropdownOpen, setNewLoadDropdownOpen] = useState(false)
  const [hideStarter, setHideStarter] = useState(false)
  const [isNewBillDialogOpen, setIsNewBillDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [pendingDeleteItem, setPendingDeleteItem] = useState<Item | null>(null)
  const [isRemovePersonDialogOpen, setIsRemovePersonDialogOpen] = useState(false)
  const [pendingRemovePerson, setPendingRemovePerson] = useState<Person | null>(null)

  const focusRingClass =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"

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

  // --- Derived Data (extracted to hook) ---
  const {
    calculatedItems, subtotal, taxAmount, tipAmount, discountAmount, grandTotal,
    personFinalShares, hasMeaningfulItems, itemsById, peopleById
  } = useBillCalculations(items, people, state.currentBill)

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
    toast({ title: "New bill created" })
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
      description: `${updatedPerson.name}'s details have been updated`
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
      setLoadBillError("Enter a bill ID to load.")
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
        setLoadBillError(result.error || "Could not find bill with that ID.")
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
      setLoadBillError(null)
    } catch (error) {
      // Only show error if this request is still current
      if (loadBillRequestRef.current === requestId) {
        setLoadBillError(error instanceof Error ? error.message : "Load failed. Try again.")
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
      setCopyError("Add people and items to copy a summary.")
      analytics.trackError("copy_summary_failed", "No data to copy")
      return
    }

    const text = generateSummaryText(state.currentBill)
    const success = await copyToClipboard(text)
    if (success) {
      setCopyError(null)
      toast({
        title: "Copied!",
        description: "Bill summary copied to clipboard"
      })
      analytics.trackBillSummaryCopied()
      analytics.trackFeatureUsed("copy_summary")
    } else {
      setCopyError("Unable to copy. Please try again.")
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
    <div className="h-dvh w-full overflow-hidden relative bg-background font-sans selection:bg-primary/20 selection:text-primary">
      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 z-20 bg-card/80 backdrop-blur-sm border-b-2 border-border shadow-[var(--receipt-shadow)]" style={{ height: 'calc(64px + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}>
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
                  "h-8 px-3 hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 font-sans",
                  focusRingClass
                )}
                title="New Bill (Cmd+N)"
              >
                <FileQuestion size={14} />
                <span>New</span>
              </button>
              <div className="h-6 w-px bg-border/80" />

            <DropdownMenu
              open={newLoadDropdownOpen}
              onOpenChange={(open) => {
                setNewLoadDropdownOpen(open)
                if (!open) setLoadBillError(null)
              }}
            >
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "h-8 px-3 hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 font-sans",
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
                          "w-full h-8 pl-7 pr-2 bg-muted/50 border border-border rounded-md text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-card transition-colors disabled:opacity-50 font-mono",
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
                      className="flex-1 h-7 px-2 bg-muted hover:bg-muted rounded text-xs font-medium text-muted-foreground transition-colors"
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
                    <p className="text-[11px] text-destructive" role="alert">
                      {loadBillError}
                    </p>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-6 w-px bg-border/80" />

            <ReceiptScanner
              onImport={handleScanImport}
              trigger={(
                <button
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors",
                    focusRingClass
                  )}
                  title="Scan receipt"
                >
                  <Camera size={14} />
                  <span className="whitespace-nowrap">Scan Receipt</span>
                </button>
              )}
            />
            <div className="h-6 w-px bg-border/80" />

            <div className="flex flex-col items-start">
              <button
                onClick={copyBreakdown}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 transition-colors",
                  focusRingClass
                )}
                title="Copy summary to clipboard (Cmd+Shift+C)"
              >
                <ClipboardCopy size={14} /> Copy Summary
              </button>
              {copyError && (
                <span className="mt-1 text-[10px] text-destructive" role="alert">
                  {copyError}
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-border/80" />
            <div className="px-1">
              <ShareBill variant="ghost" size="sm" showText={true} />
            </div>
          </div>
          </div>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main id="main-content" className="absolute inset-0 overflow-hidden z-10" style={{ paddingTop: 'calc(64px + env(safe-area-inset-top))', paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {/* LEDGER VIEW */}
        {activeView === 'ledger' && (
          <div className="h-full w-full">
            <div
              className="h-full overflow-auto px-6 py-6 outline-none overflow-auto"
              tabIndex={-1}
              style={{ contentVisibility: 'auto' }}
            >
              <div className="mx-auto w-full max-w-7xl">
                <div className="grid grid-cols-12 gap-6">
                  <section className="col-span-12 xl:col-span-9">
                    <div className="bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-border/80">
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
                            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-bold shadow-sm flex items-center gap-2 transition-colors"
                            title="Add new line item (Cmd+Shift+N)"
                          >
                            <Plus size={14} /> Add Line Item
                          </button>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted/50 border border-border text-muted-foreground">
                              <Equal size={11} className="text-primary" /> Split
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted/50 border border-border text-muted-foreground">
                              <Users size={11} className="text-primary" /> People
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-sans">
                          <span className="px-2 py-1 rounded bg-muted/50 border border-border">Tab/Enter to commit</span>
                          <span className="px-2 py-1 rounded bg-muted/50 border border-border">Esc to exit</span>
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
                          <div className="sticky top-0 bg-card border-b-2 border-border z-30 shadow-[var(--receipt-shadow)] flex text-[10px] font-bold text-muted-foreground uppercase">
                            <div className="w-12 p-3 text-center border-r border-border/50/60 flex items-center justify-center">#</div>
                            <div className="w-72 p-3 border-r border-border/50/60 flex items-center sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Item Description</div>
                            <div className="w-28 p-3 text-right border-r border-border/50/60 flex items-center justify-end">Price</div>
                            <div className="w-20 p-3 text-center border-r border-border/50/60 flex items-center justify-center">Qty</div>

                            {people.map(p => {
                              const colorObj = COLORS[p.colorIdx || 0]
                              const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              return (
                                  <button
                                    key={p.id}
                                  className={cn(
                                    "w-28 p-2 border-r border-border/50/60 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors",
                                    hoveredColumn === p.id && "bg-muted/50"
                                  )}
                                  onMouseEnter={() => setHoveredColumn(p.id)}
                                  onMouseLeave={() => setHoveredColumn(null)}
                                  onClick={() => setEditingPerson(p)}
                                    aria-label={`Edit ${p.name}`}
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
                                </button>
                              )
                            })}

                                  <button
                                    onClick={addPerson}
                                    aria-label="Add person"
                                    className="w-12 flex items-center justify-center hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Plus size={16} />
                                  </button>
                            <div className="w-28 p-3 text-right flex items-center justify-end border-l border-border sticky right-0 bg-card z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
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
                                  Add your first item to start splitting the bill. Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-bold">⌘⇧N</kbd> or click the button below.
                                </p>
                                <button
                                  onClick={addItem}
                                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add First Item
                                </button>
                              </div>
                            )}

                            {calculatedItems.map((item, rIdx) => (
                              <ContextMenu key={item.id}>
                                <ContextMenuTrigger asChild>
                                  <div className="flex group hover:bg-muted/50/50 transition-colors h-12 text-sm">
                                {/* Index / "Equal" Button */}
                                <div className="w-12 border-r border-border/50/60 flex items-center justify-center text-[10px] text-muted-foreground/40 font-mono select-none bg-muted/20 group-hover:bg-card transition-colors tabular-nums">
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
                                <div className="w-72 border-r border-border/50/60 sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-muted/50 transition-colors relative p-0 flex items-center">
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
                                          className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors flex items-center gap-1"
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
                                <div className="w-28 border-r border-border/50/60 relative p-0">
                                  <GridCell
                                    row={rIdx}
                                    col="price"
                                    value={item.price}
                                    type="number"
                                    className="text-right font-mono text-muted-foreground bg-muted/20 tabular-nums"
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
                                <div className="w-20 border-r border-border/50/60 relative p-0">
                                  <GridCell
                                    row={rIdx}
                                    col="qty"
                                    value={item.qty}
                                    type="number"
                                    className="text-center font-mono text-muted-foreground bg-muted/20 tabular-nums"
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
                                      onMouseEnter={() => setHoveredColumn(p.id)}
                                      onMouseLeave={() => setHoveredColumn(null)}
                                      aria-pressed={isAssigned}
                                      aria-label={`Toggle ${p.name} for ${item.name || 'this item'}`}
                                      className={cn(
                                        "w-28 border-r border-border/50/60 relative cursor-pointer flex items-center justify-center transition-colors duration-100 select-none active:bg-muted",
                                        isSelected && "ring-inset ring-2 ring-ring z-10",
                                        hoveredColumn === p.id && !isAssigned && "bg-muted/50"
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
                                <div className="w-16 border-r border-border/50/60 flex items-center justify-center gap-2 bg-card">
                                  <button
                                    onClick={() => duplicateItem(item)}
                                    aria-label="Duplicate row"
                                    className={cn(
                                      "size-8 flex items-center justify-center text-muted-foreground/40 hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
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
                                      "size-8 flex items-center justify-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
                                      focusRingClass
                                    )}
                                    tabIndex={0}
                                    title="Delete row"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>

                                {/* Row Total */}
                                <div className="w-28 sticky right-0 bg-card z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] border-l border-border flex items-center justify-end px-4 group-hover:bg-muted/50 font-mono text-xs font-bold text-foreground tabular-nums">
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
                                className="w-full py-2 px-4 text-muted-foreground text-xs font-semibold hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-start gap-2 border-t border-border font-sans"
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
                      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground text-balance font-sans">Start splitting in minutes</h3>
                            <p className="text-xs text-muted-foreground text-pretty font-sans">
                              Add people first, then items. Use Tab/Enter to move like a spreadsheet.
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
                          <button
                            onClick={addPerson}
                            className="w-full h-9 px-3 rounded-md bg-muted hover:bg-muted text-xs font-bold text-foreground transition-colors flex items-center justify-between"
                          >
                            <span>Add people</span>
                            <span className="text-muted-foreground">⌘⇧P</span>
                          </button>
                          <button
                            onClick={() => {
                              if (items.length === 0) {
                                addItem()
                                return
                              }
                              setSelectedCell({ row: 0, col: 'name' })
                              setEditing(true)
                            }}
                            className="w-full h-9 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-bold text-white transition-colors flex items-center justify-between"
                          >
                            <span>Add items</span>
                            <span className="text-primary-foreground/60">⌘⇧N</span>
                          </button>
                          <ReceiptScanner
                            onImport={handleScanImport}
                            trigger={(
                              <button className="w-full h-9 px-3 rounded-md bg-muted hover:bg-muted text-xs font-bold text-foreground transition-colors flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <Camera size={14} /> Scan receipt
                                </span>
                                <span className="text-muted-foreground">Optional</span>
                              </button>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground text-balance font-sans">People</h3>
                          <p className="text-xs text-muted-foreground text-pretty font-sans">Track who is splitting the bill.</p>
                        </div>
                        <button
                          onClick={addPerson}
                          aria-label="Add person"
                          className="size-8 rounded-md bg-muted hover:bg-muted text-foreground flex items-center justify-center"
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
                                className="rounded-lg border border-border/70 hover:border-border transition-colors"
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
                                  className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer"
                                  aria-expanded={isExpanded}
                                  aria-label={`Toggle ${p.name} details`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={cn("size-2.5 rounded-full", colorObj.solid)} />
                                    <span className="text-sm font-medium text-foreground font-sans">{p.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <div className="text-xs font-semibold text-foreground font-mono tabular-nums">
                                        {formatCurrencySimple(stats?.total || 0)}
                                      </div>
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
                                      "overflow-hidden px-3 pb-3 pt-0 border-t border-border/50/70 bg-muted/50/40 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
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

                                      <div className="pt-2 border-t border-border/50/70 space-y-1">
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

                    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
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
                              title: "Allocation changed",
                              description: `Tax/Tip split ${newAllocation === 'proportional' ? 'proportionally' : 'evenly'}`,
                              duration: TIMING.TOAST_SHORT
                            })
                            analytics.trackFeatureUsed("tax_tip_allocation_toggle", { allocation: newAllocation })
                          }}
                          className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted hover:bg-muted text-[10px] font-semibold text-muted-foreground"
                          title={`Current: ${state.currentBill.taxTipAllocation === 'proportional' ? 'Proportional' : 'Even'} allocation`}
                        >
                          {state.currentBill.taxTipAllocation === 'proportional' ? (
                            <Scale size={12} className="text-primary" />
                          ) : (
                            <Equal size={12} className="text-primary" />
                          )}
                          {state.currentBill.taxTipAllocation === 'proportional' ? 'Proportional' : 'Even'}
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
                            className="w-full h-9 rounded-md border border-border bg-card px-2 text-right font-mono text-foreground tabular-nums focus:border-primary focus:ring-2 focus:ring-ring/30"
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
                            className="w-full h-9 rounded-md border border-border bg-card px-2 text-right font-mono text-foreground tabular-nums focus:border-primary focus:ring-2 focus:ring-ring/30"
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
                            className="w-full h-9 rounded-md border border-border bg-card px-2 text-right font-mono text-foreground tabular-nums focus:border-primary focus:ring-2 focus:ring-ring/30"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-muted-foreground">Subtotal</label>
                          <div className="h-9 rounded-md border border-border bg-muted/50 px-2 flex items-center justify-end font-mono text-foreground tabular-nums">
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
                        <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
                          <span>Grand total</span>
                          <span className="font-mono tabular-nums">{formatCurrencySimple(grandTotal)}</span>
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
      <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 z-40 bg-card border-t-2 border-border shadow-[var(--receipt-shadow)]" style={{ height: 'calc(56px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-full px-3 py-1.5 text-[10px] text-muted-foreground font-sans">
            <span className="font-semibold text-foreground tabular-nums">{items.length}</span>
            <span>items</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="font-semibold text-foreground tabular-nums">{people.length}</span>
            <span>people</span>
            <span className="text-muted-foreground/40">•</span>
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
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold">⌘⇧N</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold">⌘⇧P</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold">⌘⇧C</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold">⌘S</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-bold">⌘Z</kbd>
            </div>
            <span className="text-muted-foreground/40">•</span>
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
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-medium focus:ring-2 focus:ring-ring focus:border-transparent font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-3 font-sans">
                  Color Theme
                </label>
                <div className="flex gap-3 flex-wrap">
                  {COLORS.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => setEditingPerson({ ...editingPerson, colorIdx: idx, color: c.hex })}
                      aria-label={`Select ${c.id} color`}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110",
                        c.solid,
                        editingPerson.colorIdx === idx && "ring-2 ring-offset-2 ring-ring scale-110"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/50/60 flex gap-3">
                <button
                  onClick={() => openRemovePersonDialog(editingPerson)}
                  className="flex-1 py-2.5 rounded-lg border border-destructive/30 text-destructive text-xs font-bold uppercase hover:bg-destructive/10 transition-colors font-sans"
                >
                  Remove
                </button>
                <button
                  onClick={() => updatePerson(editingPerson)}
                  className="flex-[2] py-2.5 rounded-lg bg-foreground text-white text-xs font-bold uppercase hover:bg-foreground/90 transition-colors shadow-lg shadow-foreground/20 font-sans"
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
