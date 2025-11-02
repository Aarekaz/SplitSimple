"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useRef } from "react"
import { getBillFromCloud, storeBillInCloud } from "@/lib/sharing"
import { toast } from "@/hooks/use-toast"

// Types
export type SyncStatus = "never_synced" | "syncing" | "synced" | "error"

export interface Person {
  id: string
  name: string
  color: string
}

export interface Item {
  id: string
  name: string
  price: string
  quantity: number
  splitWith: string[] // person IDs
  method: "even" | "shares" | "percent" | "exact"
  customSplits?: Record<string, number> // person ID -> amount/share/percent
}

// Legacy item type without quantity field (for migration)
interface LegacyItem extends Omit<Item, 'quantity'> {
  quantity?: number
}

export interface Bill {
  id: string
  title: string
  status: "draft" | "active" | "closed"
  tax: string
  tip: string
  discount: string
  taxTipAllocation: "proportional" | "even"
  notes: string
  people: Person[]
  items: Item[]
  createdAt?: string
  lastModified?: string
  accessCount?: number
  lastAccessed?: string
}

// Helper function to migrate legacy bills
function migrateBillData(bill: Partial<Bill> & { items?: LegacyItem[] }): Bill {
  return {
    ...bill,
    status: bill.status || "draft",
    notes: bill.notes || "",
    discount: bill.discount || "",
    items: bill.items?.map((item) => ({
      ...item,
      quantity: item.quantity || 1
    })) || []
  } as Bill
}

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
  | { type: "SET_BILL_STATUS"; payload: "draft" | "active" | "closed" }
  | { type: "SET_NOTES"; payload: string }
  | { type: "SET_TAX"; payload: string }
  | { type: "SET_TIP"; payload: string }
  | { type: "SET_DISCOUNT"; payload: string }
  | { type: "SET_TAX_TIP_ALLOCATION"; payload: "proportional" | "even" }
  | { type: "ADD_PERSON"; payload: { name: string; color: string } }
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

// A simple and compatible UUID generator
const simpleUUID = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Initial state
const createInitialBill = (): Bill => ({
  id: simpleUUID(),
  title: "New Bill",
  status: "draft",
  tax: "",
  tip: "",
  discount: "",
  taxTipAllocation: "proportional",
  notes: "",
  people: [],
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
      }
      const newBill = {
        ...state.currentBill,
        people: [...state.currentBill.people, newPerson],
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
    const bills = JSON.parse(billsData)
    bills[bill.id] = bill
    localStorage.setItem("splitsimple_bills", JSON.stringify(bills))
  } catch (error) {
    console.error("Failed to save bill to localStorage:", error)
  }
}

const loadBillFromLocalStorage = (billId: string): Bill | null => {
  try {
    const billsData = localStorage.getItem("splitsimple_bills")
    if (!billsData) return null
    const bills = JSON.parse(billsData)
    return bills[billId] || null
  } catch (error) {
    console.error("Failed to load bill from localStorage:", error)
    return null
  }
}

const generateShareUrl = (billId: string): string => {
  return `${window.location.origin}${window.location.pathname}?bill=${billId}`
}

export { saveBillToLocalStorage, loadBillFromLocalStorage, generateShareUrl }

function addToHistory(state: BillState, newBill: Bill): BillState {
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push(JSON.parse(JSON.stringify(state.currentBill))) // Deep clone current state

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

  // Check for shared bill on mount and load data from localStorage
  useEffect(() => {
    const loadBill = async () => {
      try {
        // Check for shared bill in URL
        const urlParams = new URLSearchParams(window.location.search)
        const sharedBillId = urlParams.get("bill")

        if (sharedBillId) {
          // First try to load from Redis (cloud)
          try {
            const cloudResult = await getBillFromCloud(sharedBillId)
            if (cloudResult.bill) {
              // Migration: Add missing fields to existing shared bills
              const migratedBill = migrateBillData(cloudResult.bill)
              dispatch({ type: "LOAD_BILL", payload: migratedBill })
              return // CRITICAL: Exit here, don't load localStorage
            }
          } catch (cloudError) {
            if (process.env.NODE_ENV === 'development') {
              console.error("Failed to load bill from cloud:", cloudError)
            }
          }

          // Fallback to localStorage for backwards compatibility
          const localSharedBill = loadBillFromLocalStorage(sharedBillId)
          if (localSharedBill) {
            // Migration: Add missing fields to existing local shared bills
            const migratedBill = migrateBillData(localSharedBill)
            dispatch({ type: "LOAD_BILL", payload: migratedBill })
            return // CRITICAL: Exit here, don't load localStorage current bill
          }

          // If shared bill not found anywhere, DON'T load localStorage
          // User expected a specific shared bill, not their own data
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Shared bill ${sharedBillId} not found in cloud or local storage`)
          }
          return // CRITICAL: Exit without loading localStorage when shared bill expected
        }

        // ONLY load current bill from localStorage if NO shared bill ID in URL
        const saved = localStorage.getItem("splitSimple_currentBill")
        if (saved) {
          const bill = JSON.parse(saved)
          // Migration: Add missing fields to existing bills
          const migratedBill = migrateBillData(bill)
          dispatch({ type: "LOAD_BILL", payload: migratedBill })
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to load bill:", error)
        }
      }
    }

    loadBill()
  }, [])

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    try {
      // Save current bill to main storage
      localStorage.setItem("splitSimple_currentBill", JSON.stringify(state.currentBill))

      // Also save to shared bills storage for sharing
      saveBillToLocalStorage(state.currentBill)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to save bill to localStorage:", error)
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
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to save even minimal bill:", fallbackError)
        }
        // Show user-friendly error notification
        toast({
          title: "Storage Full",
          description: "Unable to save your bill locally. Your data is still synced to the cloud. Consider clearing browser data or reducing bill size.",
          variant: "destructive",
        })
      }
    }
  }, [state.currentBill])

  // Debounced auto-sync to cloud when bill changes
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }

    // Only auto-sync if never synced
    if (state.syncStatus === "never_synced") {
      syncTimeoutRef.current = setTimeout(() => {
        syncToCloud()
        syncTimeoutRef.current = null
      }, 2000) // 2-second debounce
    }

    // Cleanup function
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
        syncTimeoutRef.current = null
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
