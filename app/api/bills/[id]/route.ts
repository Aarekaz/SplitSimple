import { createClient } from "redis"
import { NextRequest, NextResponse } from "next/server"
import type { Bill } from "@/contexts/BillContext"

// Create Redis client
const getRedisClient = async () => {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not set")
  }
  
  const client = createClient({ 
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
  })
  
  if (!client.isOpen) {
    await client.connect()
  }
  
  return client
}

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

    const redis = await getRedisClient()
    
    // Get bill from Redis with key prefix
    const billData = await redis.get(`bill:${billId}`)
    
    await redis.disconnect()

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

    const redis = await getRedisClient()
    
    // Store bill in Redis with 30-day expiration (2,592,000 seconds)
    await redis.setEx(
      `bill:${billId}`,
      30 * 24 * 60 * 60, // 30 days in seconds
      JSON.stringify(bill)
    )
    
    await redis.disconnect()

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
