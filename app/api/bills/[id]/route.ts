import { NextRequest, NextResponse } from "next/server"
import type { Bill } from "@/lib/bill-types"
import { getBillStore } from "@/lib/bill-store"
import { isMigratableBill, isRecord, migrateBillSchema } from "@/lib/validation"

// GET /api/bills/[id] - Retrieve a shared bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: billId } = await params
    
    if (!billId || typeof billId !== 'string') {
      return NextResponse.json(
        { error: "Invalid bill ID" },
        { status: 400 }
      )
    }

    const store = await getBillStore()
    const billRecord = await store.getBill(billId, { incrementAccess: true })

    if (!billRecord) {
      return NextResponse.json(
        { error: "Bill not found or expired" },
        { status: 404 }
      )
    }

    return NextResponse.json({ bill: billRecord.bill })
    
  } catch (error) {
    console.error("Error retrieving bill:", error)
    return NextResponse.json(
      { error: "Failed to retrieve bill" },
      { status: 500 }
    )
  }
}

// POST /api/bills/[id] - Store a bill for sharing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: billId } = await params
    
    if (!billId || typeof billId !== 'string') {
      return NextResponse.json(
        { error: "Invalid bill ID" },
        { status: 400 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("Invalid JSON body received:", parseError)
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const bill = isRecord(body) ? body.bill : undefined

    if (!isMigratableBill(bill)) {
      return NextResponse.json(
        { error: "Invalid bill data" },
        { status: 400 }
      )
    }

    // Add metadata if not present
    const now = new Date().toISOString()
    const migratedBill = migrateBillSchema(bill)
    const billWithMetadata = {
      ...migratedBill,
      createdAt: migratedBill.createdAt || now,
      lastModified: migratedBill.lastModified || now,
      accessCount: migratedBill.accessCount || 0
    }

    const store = await getBillStore()
    await store.saveBill(billId, billWithMetadata)

    return NextResponse.json({ 
      success: true,
      message: "Bill stored successfully",
      billId 
    })
    
  } catch (error) {
    console.error("Error storing bill:", error)
    return NextResponse.json(
      { error: "Failed to store bill" },
      { status: 500 }
    )
  }
}
