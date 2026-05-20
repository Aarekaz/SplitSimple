export type SyncStatus = "never_synced" | "syncing" | "synced" | "error"

export type SplitMethod = "even" | "shares" | "percent" | "exact"

export type BillStatus = "draft" | "active" | "closed"

export type TaxTipAllocation = "proportional" | "even"

export interface Person {
  id: string
  name: string
  color: string
  colorIdx?: number
}

export interface Item {
  id: string
  name: string
  price: string
  quantity: number
  splitWith: string[]
  method: SplitMethod
  customSplits?: Record<string, number>
}

export interface Bill {
  id: string
  title: string
  status: BillStatus
  tax: string
  tip: string
  discount: string
  taxTipAllocation: TaxTipAllocation
  notes: string
  people: Person[]
  items: Item[]
  createdAt?: string
  lastModified?: string
  accessCount?: number
  lastAccessed?: string
}

export type ReceiptLineItem = Omit<Item, "id" | "splitWith" | "method">

export interface OCRResult {
  items: ReceiptLineItem[]
  preview?: string
}

export interface OCRApiError extends Error {
  code?: string
  status?: number
  retryAfter?: number
}

export interface CloudStoreResult {
  success: boolean
  error?: string
}

export interface CloudBillResult {
  bill?: Bill
  error?: string
}

export interface AdminBillMetadata {
  id: string
  bill: Bill
  createdAt: string
  lastModified: string
  expiresAt: string
  accessCount: number
  size: number
  shareUrl: string
  totalAmount: number
  lastAccessed?: string
}

interface AdminSplitMethodStats {
  method: string
  count: number
  percentage: number
}

export interface AdminStats {
  totalBills: number
  activeBills: number
  draftBills: number
  closedBills: number
  totalItems: number
  totalPeople: number
  totalStorageSize: number
  averageBillSize: number
  totalMoneyProcessed: number
  averageBillValue: number
  medianBillValue: number
  largestBill: number
  smallestBill: number
  subtotalRevenue: number
  taxRevenue: number
  tipRevenue: number
  totalTaxCollected: number
  totalTipsProcessed: number
  totalDiscountsApplied: number
  billsWithTax: number
  billsWithTips: number
  billsWithDiscounts: number
  billsCreatedToday: number
  billsCreatedThisWeek: number
  billsCreatedThisMonth: number
  billsCreatedLastWeek: number
  billsCreatedLastMonth: number
  weeklyGrowth: number
  monthlyGrowth: number
  completionRate: number
  shareRate: number
  averageAccessCount: number
  sharedBills: number
  completedBills: number
  averageItemsPerBill: number
  averagePeoplePerBill: number
  complexBills: number
  largeBills: number
  popularSplitMethods: AdminSplitMethodStats[]
}
