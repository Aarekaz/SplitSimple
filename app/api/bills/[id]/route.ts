import { NextRequest, NextResponse } from "next/server"
import type { Bill } from "@/contexts/BillContext"
import { executeRedisOperation } from "@/lib/redis-pool"
import { validateEnvironment } from "@/lib/env-validation"

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
      return await client.get(`bill:${billId}`)
    })

    if (!billData) {
      return NextResponse.json(
        { error: "Bill not found or expired" },
        { status: 404 }
      )
    }

    // Parse the JSON data
    const bill: Bill = JSON.parse(billData)

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

    const body = await request.json()
    const bill: Bill = body.bill

    if (!bill || typeof bill !== 'object') {
      return NextResponse.json(
        { error: "Invalid bill data" },
        { status: 400 }
      )
    }

    // Use connection pool for Redis operation
    await executeRedisOperation(async (client) => {
      // Store bill in Redis with 30-day expiration (2,592,000 seconds)
      await client.setEx(
        `bill:${billId}`,
        30 * 24 * 60 * 60, // 30 days in seconds
        JSON.stringify(bill)
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
