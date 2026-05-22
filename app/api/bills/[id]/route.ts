import { NextRequest, NextResponse } from "next/server"
import type { Bill } from "@/lib/bill-types"
import { executeRedisOperation } from "@/lib/redis-pool"
import { validateEnvironment } from "@/lib/env-validation"
import { STORAGE } from "@/lib/constants"
import { isMigratableBill, isRecord, migrateBillSchema } from "@/lib/validation"

// GET /api/bills/[id] - Retrieve a shared bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate environment before proceeding
    const envValidation = validateEnvironment()
    if (!envValidation.isValid) {
      console.error("Environment validation failed:", envValidation.errors)
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const { id: billId } = await params
    
    if (!billId || typeof billId !== 'string') {
      return NextResponse.json(
        { error: "Invalid bill ID" },
        { status: 400 }
      )
    }

    // Use connection pool for Redis operation
    const billData = await executeRedisOperation(async (client) => {
      const data = await client.get(`bill:${billId}`)
      
      // Increment access count if bill exists
      if (data) {
        const parsedBill: unknown = JSON.parse(data)
        if (!isMigratableBill(parsedBill)) {
          return data
        }

        const bill = migrateBillSchema(parsedBill)
        const updatedBill = {
          ...bill,
          accessCount: (bill.accessCount || 0) + 1,
          lastAccessed: new Date().toISOString()
        }
        
        // Update the bill with incremented access count
        await client.setEx(
          `bill:${billId}`,
          STORAGE.BILL_TTL_SECONDS,
          JSON.stringify(updatedBill)
        )
        
        return JSON.stringify(updatedBill)
      }
      
      return data
    })

    if (!billData) {
      return NextResponse.json(
        { error: "Bill not found or expired" },
        { status: 404 }
      )
    }

    // Parse the JSON data
    const parsedBill: unknown = JSON.parse(billData)
    if (!isMigratableBill(parsedBill)) {
      return NextResponse.json(
        { error: "Invalid bill data" },
        { status: 500 }
      )
    }

    const bill: Bill = migrateBillSchema(parsedBill)

    return NextResponse.json({ bill })
    
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
    // Validate environment before proceeding
    const envValidation = validateEnvironment()
    if (!envValidation.isValid) {
      console.error("Environment validation failed:", envValidation.errors)
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

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

    // Use connection pool for Redis operation
    await executeRedisOperation(async (client) => {
      await client.setEx(
        `bill:${billId}`,
        STORAGE.BILL_TTL_SECONDS,
        JSON.stringify(billWithMetadata)
      )
    })

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
