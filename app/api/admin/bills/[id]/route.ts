import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { executeRedisOperation } from '@/lib/redis-pool'
import { validateEnvironment } from '@/lib/env-validation'
import type { Bill } from '@/contexts/BillContext'

async function getBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate environment before proceeding
    const envValidation = validateEnvironment()
    if (!envValidation.isValid) {
      console.error('Environment validation failed:', envValidation.errors)
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    const { id } = await params
    const key = `bill:${id}`

    const [bill, ttl] = await executeRedisOperation(async (redis) => {
      const data = await redis.get(key)
      const ttlValue = await redis.ttl(key)
      return [data ? JSON.parse(data) : null, ttlValue]
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id,
      bill,
      metadata: {
        ttl,
        expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : 'Never',
        size: JSON.stringify(bill).length,
        createdAt: bill.createdAt || null,
        lastModified: bill.lastModified || null
      }
    })
  } catch (error) {
    console.error('Error fetching bill:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    )
  }
}

async function updateBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const key = `bill:${id}`
    const updatedBill = await req.json()

    // Add metadata
    updatedBill.lastModified = new Date().toISOString()

    await executeRedisOperation(async (redis) => {
      await redis.set(key, JSON.stringify(updatedBill), {
        EX: 30 * 24 * 60 * 60 // 30 days
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Bill updated successfully',
      bill: updatedBill
    })
  } catch (error) {
    console.error('Error updating bill:', error)
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    )
  }
}

async function deleteBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const key = `bill:${id}`

    await executeRedisOperation(async (redis) => {
      await redis.del(key)
    })

    return NextResponse.json({
      success: true,
      message: 'Bill deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting bill:', error)
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    )
  }
}

async function extendBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { days = 30 } = await req.json()
    const key = `bill:${id}`

    const billExists = await executeRedisOperation(async (redis) => {
      const data = await redis.get(key)
      return !!data
    })

    if (!billExists) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    await executeRedisOperation(async (redis) => {
      await redis.expire(key, days * 24 * 60 * 60)
    })

    return NextResponse.json({
      success: true,
      message: `Bill expiration extended by ${days} days`
    })
  } catch (error) {
    console.error('Error extending bill:', error)
    return NextResponse.json(
      { error: 'Failed to extend bill expiration' },
      { status: 500 }
    )
  }
}

export const GET = adminAuthMiddleware(getBillHandler)
export const PUT = adminAuthMiddleware(updateBillHandler)
export const DELETE = adminAuthMiddleware(deleteBillHandler)
export const PATCH = adminAuthMiddleware(extendBillHandler)