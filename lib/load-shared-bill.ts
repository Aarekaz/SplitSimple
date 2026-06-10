// Importing next/headers makes this module server-only: it throws if pulled
// into a Client Component, so a separate "server-only" guard is unnecessary.
import { headers } from "next/headers"
import type { Bill } from "@/lib/bill-types"
import { isMigratableBill, isRecord, migrateBillSchema } from "@/lib/validation"

const SHARED_BILL_REVALIDATE_SECONDS = 300

// Server-side load of a shared bill for metadata and OG-image rendering.
// Reuses the existing /api/bills proxy (backend URL + shared secret handled
// there) via the request's own origin, so no backend wiring is duplicated.
// Returns null on any failure so callers can fall back to generic, data-free
// output rather than crashing the page or image render.
export async function loadSharedBill(billId: string): Promise<Bill | null> {
  try {
    const headerList = await headers()
    const host = headerList.get("host")
    if (!host) return null

    const protocol = headerList.get("x-forwarded-proto") ?? "https"
    const response = await fetch(`${protocol}://${host}/api/bills/${encodeURIComponent(billId)}`, {
      headers: { accept: "application/json" },
      next: { revalidate: SHARED_BILL_REVALIDATE_SECONDS },
    })
    if (!response.ok) return null

    const data: unknown = await response.json()
    const bill = isRecord(data) ? data.bill : undefined
    return isMigratableBill(bill) ? migrateBillSchema(bill) : null
  } catch {
    return null
  }
}

export { SHARED_BILL_REVALIDATE_SECONDS }
