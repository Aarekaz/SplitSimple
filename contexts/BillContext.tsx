"use client"

import type React from "react"
import { createContext, useCallback, useContext, useReducer, useEffect, useRef } from "react"
import { getBillFromCloud, getSharedBillIdFromSearch, storeBillInCloud, stripSharedBillParams } from "@/lib/sharing"
import { isMigratableBill, isRecord, migrateBillSchema, type MigratableBill } from "@/lib/validation"
import type { Bill, BillSource, BillStatus, Item, Person, SyncStatus, TaxTipAllocation } from "@/lib/bill-types"

// State and Actions
interface BillState {
  currentBill: Bill
  history: Bill[]
  historyIndex: number
  maxHistorySize: number
  billSource: BillSource
  sharedOriginBillId: string | null
  syncStatus: SyncStatus
  lastSyncTime: number | null
}

type BillAction =
  | { type: "SET_BILL_TITLE"; payload: string }
  | { type: "SET_BILL_STATUS"; payload: BillStatus }
  | { type: "SET_NOTES"; payload: string }
  | { type: "SET_TAX"; payload: string }
  | { type: "SET_TIP"; payload: string }
  | { type: "SET_DISCOUNT"; payload: string }
  | { type: "SET_TAX_TIP_ALLOCATION"; payload: TaxTipAllocation }
  | { type: "ADD_PERSON"; payload: { name: string; color: string } }
  | { type: "UPDATE_PERSON"; payload: Person }
  | { type: "REMOVE_PERSON"; payload: string }
  | { type: "ADD_ITEM"; payload: Omit<Item, "id"> }
  | { type: "UPDATE_ITEM"; payload: Item }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "REORDER_ITEMS"; payload: { startIndex: number; endIndex: number } }
  | {
      type: "LOAD_BILL"
      payload: {
        bill: Bill
        source: "draft" | "shared"
        sharedOriginBillId?: string | null
      }
    }
  | { type: "NEW_BILL" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_SYNC_STATUS"; payload: SyncStatus }
  | { type: "SYNC_TO_CLOUD" }

// Default colors for people
const PERSON_COLORS = [
  "#6366f1",
  "#d97706",
  "#dc2626",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#10b981",
  "#f97316",
]

const getRandomColor = () => {
  const letters = "0123456789ABCDEF"
  let color = "#"
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

const simpleUUID = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

const createInitialBill = (): Bill => ({
  id: simpleUUID(),
  title: "New Bill",
  status: "active",
  tax: "",
  tip: "",
  discount: "",
  taxTipAllocation: "proportional",
  notes: "",
  people: [
    {
      id: simpleUUID(),
      name: "Person 1",
      color: PERSON_COLORS[0],
      colorIdx: 0
    }
  ],
  items: [],
})

const initialState: BillState = {
  currentBill: createInitialBill(),
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  billSource: "draft",
  sharedOriginBillId: null,
  syncStatus: "never_synced",
  lastSyncTime: null,
}

const EDITABLE_BILL_ACTIONS = new Set<BillAction["type"]>([
  "SET_BILL_TITLE",
  "SET_BILL_STATUS",
  "SET_NOTES",
  "SET_TAX",
  "SET_TIP",
  "SET_DISCOUNT",
  "SET_TAX_TIP_ALLOCATION",
  "ADD_PERSON",
  "UPDATE_PERSON",
  "REMOVE_PERSON",
  "ADD_ITEM",
  "UPDATE_ITEM",
  "REMOVE_ITEM",
  "REORDER_ITEMS",
])

const createSharedBillCopy = (state: BillState): BillState => {
  const sharedOriginBillId = state.sharedOriginBillId ?? state.currentBill.id
  const currentBill = {
    ...structuredClone(state.currentBill),
    id: simpleUUID(),
  }

  return {
    ...state,
    currentBill,
    billSource: "shared_copy",
    sharedOriginBillId,
    syncStatus: "never_synced",
    lastSyncTime: null,
  }
}

const getEditableState = (state: BillState, actionType: BillAction["type"]): BillState => {
  if (state.billSource !== "shared") {
    return state
  }

  if (!EDITABLE_BILL_ACTIONS.has(actionType)) {
    return state
  }

  return createSharedBillCopy(state)
}

// Reducer
function billReducer(state: BillState, action: BillAction): BillState {
  const editableState = getEditableState(state, action.type)

  switch (action.type) {
    case "SET_BILL_TITLE": {
      const newBill = { ...editableState.currentBill, title: action.payload }
      return addToHistory(editableState, newBill)
    }

    case "SET_BILL_STATUS": {
      const newBill = { ...editableState.currentBill, status: action.payload }
      return addToHistory(editableState, newBill)
    }

    case "SET_NOTES": {
      const newBill = { ...editableState.currentBill, notes: action.payload }
      return addToHistory(editableState, newBill)
    }

    case "SET_TAX": {
      const newBill = { ...editableState.currentBill, tax: action.payload }
      return addToHistory(editableState, newBill)
    }

    case "SET_TIP": {
      const newBill = { ...editableState.currentBill, tip: action.payload }
      return addToHistory(editableState, newBill)
    }

    case "SET_DISCOUNT": {
      const newBill = { ...editableState.currentBill, discount: action.payload }
      return addToHistory(editableState, newBill)
    }

    case "SET_TAX_TIP_ALLOCATION": {
      const newBill = { ...editableState.currentBill, taxTipAllocation: action.payload }
      return addToHistory(editableState, newBill)
    }

    case "ADD_PERSON": {
      const usedColors = new Set(editableState.currentBill.people.map((p) => p.color))
      let newColor = ""

      if (action.payload.color) {
        newColor = action.payload.color
      } else {
        const availableColor = PERSON_COLORS.find((c) => !usedColors.has(c))
        newColor = availableColor || getRandomColor()
      }

      const newPerson: Person = {
        id: simpleUUID(),
        name: action.payload.name,
        color: newColor,
        colorIdx: editableState.currentBill.people.length % 6, // Assign color index for Pro design (0-5)
      }
      const newBill = {
        ...editableState.currentBill,
        people: [...editableState.currentBill.people, newPerson],
      }
      return addToHistory(editableState, newBill)
    }

    case "UPDATE_PERSON": {
      const newBill = {
        ...editableState.currentBill,
        people: editableState.currentBill.people.map((p) => (p.id === action.payload.id ? action.payload : p)),
      }
      return addToHistory(editableState, newBill)
    }

    case "REMOVE_PERSON": {
      const newBill = {
        ...editableState.currentBill,
        people: editableState.currentBill.people.filter((p) => p.id !== action.payload),
        items: editableState.currentBill.items.map((item) => ({
          ...item,
          splitWith: item.splitWith.filter((id) => id !== action.payload),
        })),
      }
      return addToHistory(editableState, newBill)
    }

    case "ADD_ITEM": {
      const newItem: Item = {
        ...action.payload,
        id: simpleUUID(),
      }
      const newBill = {
        ...editableState.currentBill,
        items: [...editableState.currentBill.items, newItem],
      }
      return addToHistory(editableState, newBill)
    }

    case "UPDATE_ITEM": {
      const newBill = {
        ...editableState.currentBill,
        items: editableState.currentBill.items.map((item) => (item.id === action.payload.id ? action.payload : item)),
      }
      return addToHistory(editableState, newBill)
    }

    case "REMOVE_ITEM": {
      const newBill = {
        ...editableState.currentBill,
        items: editableState.currentBill.items.filter((item) => item.id !== action.payload),
      }
      return addToHistory(editableState, newBill)
    }

    case "REORDER_ITEMS": {
      const { startIndex, endIndex } = action.payload
      const newItems = Array.from(editableState.currentBill.items)
      const [removed] = newItems.splice(startIndex, 1)
      newItems.splice(endIndex, 0, removed)
      const newBill = {
        ...editableState.currentBill,
        items: newItems,
      }
      return addToHistory(editableState, newBill)
    }

    case "LOAD_BILL": {
      return {
        ...initialState,
        currentBill: action.payload.bill,
        history: [],
        historyIndex: -1,
        billSource: action.payload.source,
        sharedOriginBillId:
          action.payload.source === "shared"
            ? action.payload.sharedOriginBillId ?? action.payload.bill.id
            : action.payload.sharedOriginBillId ?? null,
        syncStatus: action.payload.source === "shared" ? "synced" : "never_synced",
        lastSyncTime: action.payload.source === "shared" ? Date.now() : null,
      }
    }

    case "NEW_BILL": {
      const newBill = createInitialBill()
      return {
        ...state,
        currentBill: newBill,
        history: [],
        historyIndex: -1,
        billSource: "draft",
        sharedOriginBillId: null,
        syncStatus: "never_synced",
        lastSyncTime: null,
      }
    }

    case "UNDO": {
      if (state.historyIndex >= 0) {
        const previousBill = state.history[state.historyIndex]
        return {
          ...state,
          currentBill: previousBill,
          historyIndex: state.historyIndex - 1,
          syncStatus: "never_synced", // Mark as needing sync after undo
        }
      }
      return state
    }

    case "REDO": {
      if (state.historyIndex < state.history.length - 1) {
        const nextBill = state.history[state.historyIndex + 1]
        return {
          ...state,
          currentBill: nextBill,
          historyIndex: state.historyIndex + 1,
          syncStatus: "never_synced", // Mark as needing sync after redo
        }
      }
      return state
    }

    case "SET_SYNC_STATUS": {
      return {
        ...state,
        syncStatus: action.payload,
        lastSyncTime: action.payload === "synced" ? Date.now() : state.lastSyncTime,
      }
    }

    case "SYNC_TO_CLOUD": {
      return {
        ...state,
        syncStatus: "syncing",
      }
    }

    default:
      return state
  }
}

// Sharing functionality
const saveBillToLocalStorage = (bill: Bill) => {
  try {
    const billsData = localStorage.getItem("splitsimple_bills") || "{}"
    const parsedBills: unknown = JSON.parse(billsData)
    const bills: Record<string, unknown> = {}
    if (isRecord(parsedBills)) {
      for (const [id, storedBill] of Object.entries(parsedBills)) {
        bills[id] = storedBill
      }
    }
    bills[bill.id] = bill
    localStorage.setItem("splitsimple_bills", JSON.stringify(bills))
  } catch (error) {
    console.error("Failed to save bill to localStorage:", error)
  }
}

const loadBillFromLocalStorage = (billId: string): MigratableBill | null => {
  try {
    const billsData = localStorage.getItem("splitsimple_bills")
    if (!billsData) return null
    const bills: unknown = JSON.parse(billsData)
    if (!isRecord(bills)) return null

    const bill = bills[billId]
    return isMigratableBill(bill) ? bill : null
  } catch (error) {
    console.error("Failed to load bill from localStorage:", error)
    return null
  }
}

const getSharedBillIdFromLocation = (): string | null => {
  if (typeof window === "undefined") return null

  return getSharedBillIdFromSearch(window.location.search)
}

const clearSharedBillParamsFromLocation = () => {
  if (typeof window === "undefined") return

  const nextSearch = stripSharedBillParams(window.location.search)
  const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`
  window.history.replaceState(window.history.state, "", nextUrl)
}

const generateShareUrl = (billId: string): string => {
  // Ensure we always use the root path for sharing
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/?bill=${billId}`
}

function addToHistory(state: BillState, newBill: Bill): BillState {
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push(structuredClone(state.currentBill))

  // Limit history size
  if (newHistory.length > state.maxHistorySize) {
    newHistory.shift()
  }

  return {
    ...state,
    currentBill: newBill,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    syncStatus: "never_synced", // Mark as needing sync when bill changes
  }
}

// Context
const BillContext = createContext<{
  state: BillState
  dispatch: React.Dispatch<BillAction>
  canUndo: boolean
  canRedo: boolean
  syncToCloud: () => Promise<void>
} | null>(null)

// Provider
export function BillProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(billReducer, initialState)
  const sharedBillIdRef = useRef<string | null>(null)
  const sharedBillLoadRequestRef = useRef(0)

  const canUndo = state.historyIndex >= 0
  const canRedo = state.historyIndex < state.history.length - 1

  const dispatch = useCallback((action: BillAction) => {
    const shouldClearSharedUrl =
      state.billSource === "shared" && (EDITABLE_BILL_ACTIONS.has(action.type) || action.type === "NEW_BILL")

    if (shouldClearSharedUrl) {
      clearSharedBillParamsFromLocation()
    }

    rawDispatch(action)
  }, [state.billSource])

  // Auto-sync to cloud functionality
  const syncToCloud = async () => {
    if (state.billSource === "shared") return
    if (state.syncStatus === "syncing") return // Avoid duplicate sync calls
    
    rawDispatch({ type: "SYNC_TO_CLOUD" })
    
    try {
      const result = await storeBillInCloud(state.currentBill)
      if (result.success) {
        rawDispatch({ type: "SET_SYNC_STATUS", payload: "synced" })
      } else {
        rawDispatch({ type: "SET_SYNC_STATUS", payload: "error" })
      }
    } catch (error) {
      console.error("Sync to cloud failed:", error)
      rawDispatch({ type: "SET_SYNC_STATUS", payload: "error" })
    }
  }

  // Load a shared bill on first mount and whenever the URL query changes in-place.
  useEffect(() => {
    const loadBillFromLocation = async (loadLocalFallback: boolean) => {
      const sharedBillId = getSharedBillIdFromLocation()
      const previousSharedBillId = sharedBillIdRef.current
      sharedBillIdRef.current = sharedBillId

      if (sharedBillId === previousSharedBillId && sharedBillId !== null) {
        return
      }

      const requestId = ++sharedBillLoadRequestRef.current

      if (!sharedBillId) {
        if (!loadLocalFallback) return

        try {
          const saved = localStorage.getItem("splitSimple_currentBill")
          if (saved) {
            const bill: unknown = JSON.parse(saved)
            if (isMigratableBill(bill)) {
              rawDispatch({
                type: "LOAD_BILL",
                payload: {
                  bill: migrateBillSchema(bill),
                  source: "draft",
                },
              })
            }
          }
        } catch (error) {
          console.error("Failed to load bill:", error)
        }
        return
      }

      try {
        const cloudResult = await getBillFromCloud(sharedBillId)
        if (sharedBillLoadRequestRef.current !== requestId) return

        if (cloudResult.bill) {
          const migratedBill = migrateBillSchema(cloudResult.bill)
          rawDispatch({
            type: "LOAD_BILL",
            payload: {
              bill: migratedBill,
              source: "shared",
              sharedOriginBillId: sharedBillId,
            },
          })

          if (typeof window !== "undefined") {
            const event = new CustomEvent("bill-loaded-success", {
              detail: {
                title: cloudResult.bill.title,
                people: cloudResult.bill.people.length,
                items: cloudResult.bill.items.length,
              },
            })
            window.dispatchEvent(event)
          }
          return
        }

        const localSharedBill = loadBillFromLocalStorage(sharedBillId)
        if (sharedBillLoadRequestRef.current !== requestId) return

        if (localSharedBill) {
          const migratedBill = migrateBillSchema(localSharedBill)
          rawDispatch({
            type: "LOAD_BILL",
            payload: {
              bill: migratedBill,
              source: "shared",
              sharedOriginBillId: sharedBillId,
            },
          })

          if (typeof window !== "undefined") {
            const event = new CustomEvent("bill-loaded-success", {
              detail: {
                title: localSharedBill.title,
                people: localSharedBill.people.length,
                items: localSharedBill.items.length,
              },
            })
            window.dispatchEvent(event)
          }
          return
        }

        console.error(`[BillContext] Shared bill ${sharedBillId} not found in cloud or local storage`)
        if (typeof window !== "undefined") {
          const event = new CustomEvent("bill-load-failed", {
            detail: {
              billId: sharedBillId,
              error: cloudResult.error || "Bill not found or expired",
            },
          })
          window.dispatchEvent(event)
        }
      } catch (error) {
        console.error("Failed to load shared bill:", error)
      }
    }

    const handleLocationChange = () => {
      void loadBillFromLocation(false)
    }

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function (...args) {
      const result = originalPushState.apply(this, args)
      window.dispatchEvent(new Event("splitsimple-location-change"))
      return result
    }

    window.history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args)
      window.dispatchEvent(new Event("splitsimple-location-change"))
      return result
    }

    window.addEventListener("popstate", handleLocationChange)
    window.addEventListener("splitsimple-location-change", handleLocationChange)

    void loadBillFromLocation(true)

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener("popstate", handleLocationChange)
      window.removeEventListener("splitsimple-location-change", handleLocationChange)
    }
  }, [])

  // Debounced persistence whenever the active bill changes (500ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        saveBillToLocalStorage(state.currentBill)

        if (state.billSource === "shared") {
          return
        }

        localStorage.setItem("splitSimple_currentBill", JSON.stringify(state.currentBill))
      } catch (error) {
        console.error("Failed to save bill to localStorage:", error)

        if (state.billSource === "shared") {
          return
        }

        // Try to save with a smaller payload if the bill is too large
        try {
          const minimalBill = {
            ...state.currentBill,
            items: state.currentBill.items.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              splitWith: item.splitWith,
              method: item.method,
              customSplits: item.customSplits
            }))
          }
          localStorage.setItem("splitSimple_currentBill", JSON.stringify(minimalBill))
        } catch (fallbackError) {
          console.error("Failed to save even minimal bill:", fallbackError)
          // At this point, we've exhausted our options - could show a user notification
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [state.billSource, state.currentBill])

  // Debounced auto-sync to cloud when bill changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined
    
    if (state.billSource !== "shared" && state.syncStatus === "never_synced") {
      timeoutId = setTimeout(() => {
        syncToCloud()
      }, 2000) // 2-second debounce
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [state.billSource, state.currentBill, state.syncStatus])

  return <BillContext.Provider value={{ state, dispatch, canUndo, canRedo, syncToCloud }}>{children}</BillContext.Provider>
}

// Hook
export function useBill() {
  const context = useContext(BillContext)
  if (!context) {
    throw new Error("useBill must be used within a BillProvider")
  }
  return context
}
