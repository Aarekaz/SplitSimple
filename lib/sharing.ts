import type { Bill, CloudBillResult, CloudStoreResult } from "@/lib/bill-types"
import { normalizeBillForPersistence } from "@/lib/persisted-bill"
import { isMigratableBill, isRecord, migrateBillSchema } from "@/lib/validation"

const FULL_BILL_ID_PATTERN = /^\d{13}-[a-z0-9]+$/i
const SHARED_BILL_PATH_PATTERN = /^\/b\/([^/?#]+)\/?$/

function normalizeSearchInput(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search
}

function normalizeSearchOutput(search: string): string {
  if (!search) return ""
  return search.startsWith("?") ? search : `?${search}`
}

export function getSharedBillIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(normalizeSearchInput(search))
  return params.get("bill") || params.get("share")
}

export function getSharedBillIdFromPathname(pathname: string): string | null {
  const match = pathname.match(SHARED_BILL_PATH_PATTERN)
  return match ? decodeURIComponent(match[1]) : null
}

export function getSharedBillIdFromLocationParts(pathname: string, search: string): string | null {
  return getSharedBillIdFromPathname(pathname) || getSharedBillIdFromSearch(search)
}

export function stripSharedBillParams(search: string): string {
  const params = new URLSearchParams(normalizeSearchInput(search))
  params.delete("bill")
  params.delete("share")

  const nextSearch = params.toString()
  return nextSearch ? `?${nextSearch}` : ""
}

export function buildSharedBillPath(billId: string): string {
  return `/b/${encodeURIComponent(billId)}`
}

export function buildAppUrl(pathname: string, search = "", hash = ""): string {
  return `${pathname}${normalizeSearchOutput(search)}${hash}`
}

export function stripSharedBillLocation(pathname: string, search: string, hash = ""): string {
  const nextPathname = getSharedBillIdFromPathname(pathname) ? "/" : pathname
  const nextSearch = stripSharedBillParams(search)
  return buildAppUrl(nextPathname, nextSearch, hash)
}

export function extractBillIdFromInput(input: string): string {
  const trimmed = input.trim().replace(/^#/, "")
  if (!trimmed) return ""

  if (FULL_BILL_ID_PATTERN.test(trimmed)) {
    return trimmed
  }

  const queryStart = trimmed.indexOf("?")
  if (queryStart >= 0) {
    const sharedId = getSharedBillIdFromSearch(trimmed.slice(queryStart))
    if (sharedId) {
      return sharedId.trim()
    }
  }

  const pathnameBillId = getSharedBillIdFromPathname(trimmed)
  if (pathnameBillId) {
    return pathnameBillId
  }

  try {
    const url = new URL(trimmed)
    const sharedId = getSharedBillIdFromSearch(url.search)
    if (sharedId) {
      return sharedId.trim()
    }

    const pathId = getSharedBillIdFromPathname(url.pathname)
    if (pathId) {
      return pathId.trim()
    }
  } catch {
    // Fall through to raw input so callers can show the right validation error.
  }

  return trimmed
}

// Store bill via the app's API proxy
export async function storeBillInCloud(bill: Bill): Promise<CloudStoreResult> {
  try {
    const response = await fetch(`/api/bills/${bill.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bill: normalizeBillForPersistence(bill) }),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to store bill'
      
      try {
        const errorData: unknown = await response.json()
        if (isRecord(errorData) && typeof errorData.error === 'string') {
          errorMessage = errorData.error
        }
      } catch {
        // Handle non-JSON error responses
        if (response.status === 413) {
          errorMessage = 'Bill is too large to store'
        } else if (response.status === 429) {
          errorMessage = 'Too many requests, please try again later'
        } else if (response.status >= 500) {
          errorMessage = 'Server error, please try again later'
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    return { success: true }
  } catch (error) {
    console.error('Error storing bill in cloud:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Retrieve bill via the app's API proxy
export async function getBillFromCloud(billId: string): Promise<CloudBillResult> {
  try {
    const response = await fetch(`/api/bills/${billId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { error: "We couldn't find that bill. Bills expire after 6 months — ask the owner for a fresh link, or double-check the ID." }
      }

      let errorMessage = 'Something went wrong loading this bill. Please try again.'

      try {
        const errorData: unknown = await response.json()
        if (isRecord(errorData) && typeof errorData.error === 'string') {
          errorMessage = errorData.error
        }
      } catch {
        // Handle non-JSON error responses
        if (response.status === 429) {
          errorMessage = "You've made too many requests. Wait a moment and try again."
        } else if (response.status >= 500) {
          errorMessage = "Our servers are having trouble. Please try again in a minute."
        }
      }

      throw new Error(errorMessage)
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new Error("We got an unexpected response from the server. Please try again.")
    }

    const bill = isRecord(data) ? data.bill : undefined
    if (!isMigratableBill(bill)) {
      throw new Error("This bill link is missing its data. Ask the owner to share a new link.")
    }

    return { bill: migrateBillSchema(bill) }
  } catch (error) {
    console.error('Error retrieving bill from cloud:', error)
    // Network failures (fetch itself throws) land here
    if (error instanceof TypeError) {
      return { error: "Couldn't reach the server. Check your connection and try again." }
    }
    return {
      error: error instanceof Error ? error.message : "Something unexpected happened. Please try again."
    }
  }
}

// Generate shareable URL
export function generateCloudShareUrl(billId: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}${buildSharedBillPath(billId)}`
}
