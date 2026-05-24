import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { getBillStore } from '@/lib/bill-store'
import { isMigratableBill, isRecord, migrateBillSchema } from '@/lib/validation'

async function getBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const store = await getBillStore()
    const billRecord = await store.getBill(id)

    if (!billRecord) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id,
      bill: billRecord.bill,
      metadata: {
        ttl: billRecord.ttl,
        expiresAt: billRecord.expiresAt,
        size: billRecord.size,
        createdAt: billRecord.createdAt,
        lastModified: billRecord.lastModified
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
    const body: unknown = await req.json()

    if (!isMigratableBill(body)) {
      return NextResponse.json(
        { error: 'Invalid bill data' },
        { status: 400 }
      )
    }

    // Add metadata
    const updatedBill = {
      ...migrateBillSchema(body),
      lastModified: new Date().toISOString()
    }

    const store = await getBillStore()
    await store.saveBill(id, updatedBill)

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
    const store = await getBillStore()
    await store.deleteBill(id)

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
    const body: unknown = await req.json()
    const days = isRecord(body) && typeof body.days === 'number' ? body.days : 30
    const store = await getBillStore()
    const billExists = await store.extendBill(id, days)

    if (!billExists) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

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
