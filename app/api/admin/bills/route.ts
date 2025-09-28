import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { executeRedisOperation } from '@/lib/redis-pool'
import { validateEnvironment } from '@/lib/env-validation'
import type { Bill } from '@/contexts/BillContext'

interface BillMetadata {
  id: string
  bill: Bill
  createdAt: string
  lastModified: string
  expiresAt: string
  accessCount: number
  size: number
  shareUrl: string
}

async function getAllBillsHandler(req: NextRequest) {
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
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const sortBy = searchParams.get('sortBy') || 'lastModified'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Get all keys matching the bill pattern
    const keys = await executeRedisOperation(async (redis) => {
      return redis.keys('bill:*')
    })

    // Fetch all bills with metadata
    const billsPromises = keys.map(async (key) => {
      const [billData, ttl] = await executeRedisOperation(async (redis) => {
        const data = await redis.get(key)
        const ttlValue = await redis.ttl(key)
        return [data ? JSON.parse(data) : null, ttlValue]
      })

      if (billData) {
        const id = key.replace('bill:', '')
        const metadata: BillMetadata = {
          id,
          bill: billData,
          createdAt: billData.createdAt || new Date().toISOString(),
          lastModified: billData.lastModified || new Date().toISOString(),
          expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : 'Never',
          accessCount: billData.accessCount || 0,
          size: JSON.stringify(billData).length,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?share=${id}`
        }
        return metadata
      }
      return null
    })

    let bills = (await Promise.all(billsPromises)).filter((b): b is BillMetadata => b !== null)

    // Filter by search
    if (search) {
      bills = bills.filter(b =>
        b.bill.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.id.includes(search) ||
        b.bill.items?.some(item => item.name.toLowerCase().includes(search.toLowerCase())) ||
        b.bill.people?.some(person => person.name.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // Filter by status
    if (status !== 'all') {
      bills = bills.filter(b => b.bill.status === status)
    }

    // Sort bills
    bills.sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case 'title':
          compareValue = (a.bill.title || '').localeCompare(b.bill.title || '')
          break
        case 'status':
          compareValue = (a.bill.status || '').localeCompare(b.bill.status || '')
          break
        case 'createdAt':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'lastModified':
          compareValue = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
          break
        case 'size':
          compareValue = a.size - b.size
          break
        case 'items':
          compareValue = (a.bill.items?.length || 0) - (b.bill.items?.length || 0)
          break
        case 'people':
          compareValue = (a.bill.people?.length || 0) - (b.bill.people?.length || 0)
          break
        default:
          compareValue = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
      }

      return sortOrder === 'desc' ? -compareValue : compareValue
    })

    // Paginate results
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedBills = bills.slice(startIndex, endIndex)

    // Calculate statistics
    const stats = {
      totalBills: bills.length,
      activeBills: bills.filter(b => b.bill.status === 'active').length,
      draftBills: bills.filter(b => b.bill.status === 'draft').length,
      closedBills: bills.filter(b => b.bill.status === 'closed').length,
      totalItems: bills.reduce((sum, b) => sum + (b.bill.items?.length || 0), 0),
      totalPeople: bills.reduce((sum, b) => sum + (b.bill.people?.length || 0), 0),
      totalStorageSize: bills.reduce((sum, b) => sum + b.size, 0),
      averageBillSize: bills.length > 0 ? Math.round(bills.reduce((sum, b) => sum + b.size, 0) / bills.length) : 0
    }

    return NextResponse.json({
      bills: paginatedBills,
      pagination: {
        page,
        limit,
        total: bills.length,
        totalPages: Math.ceil(bills.length / limit)
      },
      stats
    })
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

export const GET = adminAuthMiddleware(getAllBillsHandler)