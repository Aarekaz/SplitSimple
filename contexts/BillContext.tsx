"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { getBillFromCloud, storeBillInCloud } from "@/lib/sharing"
import { isMigratableBill, isRecord, migrateBillSchema, type MigratableBill } from "@/lib/validation"
import type { Bill, BillStatus, Item, Person, SyncStatus, TaxTipAllocation } from "@/lib/bill-types"

// State and Actions
interface BillState {
  currentBill: Bill
  history: Bill[]
  historyIndex: number
  maxHistorySize: number
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
  | { type: "LOAD_BILL"; payload: Bill }
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
  syncStatus: "never_synced",
  lastSyncTime: null,
}

// Reducer
function billReducer(state: BillState, action: BillAction): BillState {
  switch (action.type) {
    case "SET_BILL_TITLE": {
      const newBill = { ...state.currentBill, title: action.payload }
      return addToHistory(state, newBill)
    }

    case "SET_BILL_STATUS": {
      const newBill = { ...state.currentBill, status: action.payload }
      return addToHistory(state, newBill)
    }

    case "SET_NOTES": {
      const newBill = { ...state.currentBill, notes: action.payload }
      return addToHistory(state, newBill)
    }

    case "SET_TAX": {
      const newBill = { ...state.currentBill, tax: action.payload }
      return addToHistory(state, newBill)
    }

    case "SET_TIP": {
      const newBill = { ...state.currentBill, tip: action.payload }
      return addToHistory(state, newBill)
    }

    case "SET_DISCOUNT": {
      const newBill = { ...state.currentBill, discount: action.payload }
      return addToHistory(state, newBill)
    }

    case "SET_TAX_TIP_ALLOCATION": {
      const newBill = { ...state.currentBill, taxTipAllocation: action.payload }
      return addToHistory(state, newBill)
    }

    case "ADD_PERSON": {
      const usedColors = new Set(state.currentBill.people.map((p) => p.color))
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
        colorIdx: state.currentBill.people.length % 6, // Assign color index for Pro design (0-5)
      }
      const newBill = {
        ...state.currentBill,
        people: [...state.currentBill.people, newPerson],
      }
      return addToHistory(state, newBill)
    }

    case "UPDATE_PERSON": {
      const newBill = {
        ...state.currentBill,
        people: state.currentBill.people.map((p) => (p.id === action.payload.id ? action.payload : p)),
      }
      return addToHistory(state, newBill)
    }

    case "REMOVE_PERSON": {
      const newBill = {
        ...state.currentBill,
        people: state.currentBill.people.filter((p) => p.id !== action.payload),
        items: state.currentBill.items.map((item) => ({
          ...item,
          splitWith: item.splitWith.filter((id) => id !== action.payload),
        })),
      }
      return addToHistory(state, newBill)
    }

    case "ADD_ITEM": {
      const newItem: Item = {
        ...action.payload,
        id: simpleUUID(),
      }
      const newBill = {
        ...state.currentBill,
        items: [...state.currentBill.items, newItem],
      }
      return addToHistory(state, newBill)
    }

    case "UPDATE_ITEM": {
      const newBill = {
        ...state.currentBill,
        items: state.currentBill.items.map((item) => (item.id === action.payload.id ? action.payload : item)),
      }
      return addToHistory(state, newBill)
    }

    case "REMOVE_ITEM": {
      const newBill = {
        ...state.currentBill,
        items: state.currentBill.items.filter((item) => item.id !== action.payload),
      }
      return addToHistory(state, newBill)
    }

    case "REORDER_ITEMS": {
      const { startIndex, endIndex } = action.payload
      const newItems = Array.from(state.currentBill.items)
      const [removed] = newItems.splice(startIndex, 1)
      newItems.splice(endIndex, 0, removed)
      const newBill = {
        ...state.currentBill,
        items: newItems,
      }
      return addToHistory(state, newBill)
    }

    case "LOAD_BILL": {
      return {
        ...initialState,
        currentBill: action.payload,
        history: [],
        historyIndex: -1,
      }
    }

    case "NEW_BILL": {
      const newBill = createInitialBill()
      return {
        ...state,
        currentBill: newBill,
        history: [],
        historyIndex: -1,
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

  const params = new URLSearchParams(window.location.search)
  return params.get("bill") || params.get("share")
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
  const [state, dispatch] = useReducer(billReducer, initialState)

  const canUndo = state.historyIndex >= 0
  const canRedo = state.historyIndex < state.history.length - 1

  // Auto-sync to cloud functionality
  const syncToCloud = async () => {
    if (state.syncStatus === "syncing") return // Avoid duplicate sync calls
    
    dispatch({ type: "SYNC_TO_CLOUD" })
    
    try {
      const result = await storeBillInCloud(state.currentBill)
      if (result.success) {
        dispatch({ type: "SET_SYNC_STATUS", payload: "synced" })
      } else {
        dispatch({ type: "SET_SYNC_STATUS", payload: "error" })
      }
    } catch (error) {
      console.error("Sync to cloud failed:", error)
      dispatch({ type: "SET_SYNC_STATUS", payload: "error" })
    }
  }

  // Load a shared bill on first mount and whenever the URL query changes in-place.
  useEffect(() => {
    const loadBillFromLocation = async (loadLocalFallback: boolean) => {
      const sharedBillId = getSharedBillIdFromLocation()
      if (!sharedBillId) {
        if (!loadLocalFallback) return

        try {
          const saved = localStorage.getItem("splitSimple_currentBill")
          if (saved) {
            const bill: unknown = JSON.parse(saved)
            if (isMigratableBill(bill)) {
              dispatch({ type: "LOAD_BILL", payload: migrateBillSchema(bill) })
            }
          }
        } catch (error) {
          console.error("Failed to load bill:", error)
        }
        return
      }

      try {
        const cloudResult = await getBillFromCloud(sharedBillId)
        if (cloudResult.bill) {
          const migratedBill = migrateBillSchema(cloudResult.bill)
          dispatch({ type: "LOAD_BILL", payload: migratedBill })

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
        if (localSharedBill) {
          const migratedBill = migrateBillSchema(localSharedBill)
          dispatch({ type: "LOAD_BILL", payload: migratedBill })

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

  // Debounced auto-save to localStorage whenever state changes (500ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        // Save current bill to main storage
        localStorage.setItem("splitSimple_currentBill", JSON.stringify(state.currentBill))

        // Also save to shared bills storage for sharing
        saveBillToLocalStorage(state.currentBill)
      } catch (error) {
        console.error("Failed to save bill to localStorage:", error)

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
  }, [state.currentBill])

  // Debounced auto-sync to cloud when bill changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined
    
    if (state.syncStatus === "never_synced") {
      timeoutId = setTimeout(() => {
        syncToCloud()
      }, 2000) // 2-second debounce
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [state.currentBill, state.syncStatus])

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
