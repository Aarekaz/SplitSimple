import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { executeRedisOperation } from '@/lib/redis-pool'
import { validateEnvironment } from '@/lib/env-validation'
import { getBillSummary } from '@/lib/calculations'
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
  totalAmount: number
}

// Helper function to get the correct base URL
function getBaseUrl(req: NextRequest): string {
  // In production, use NEXT_PUBLIC_APP_URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  // Otherwise, construct from request headers
  const protocol = req.headers.get('x-forwarded-proto') || 'http'
  const host = req.headers.get('host') || 'localhost:3000'
  return `${protocol}://${host}`
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
        const billSummary = getBillSummary(billData)
        const metadata: BillMetadata = {
          id,
          bill: billData,
          createdAt: billData.createdAt || new Date().toISOString(),
          lastModified: billData.lastModified || new Date().toISOString(),
          expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : 'Never',
          accessCount: billData.accessCount || 0,
          size: JSON.stringify(billData).length,
          shareUrl: `${getBaseUrl(req)}?share=${id}`,
          totalAmount: billSummary.total
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
        case 'total':
          compareValue = a.totalAmount - b.totalAmount
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

    // Calculate enhanced statistics - Phase 1
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Basic counts
    const totalBills = bills.length
    const activeBills = bills.filter(b => b.bill.status === 'active').length
    const draftBills = bills.filter(b => b.bill.status === 'draft').length
    const closedBills = bills.filter(b => b.bill.status === 'closed').length
    
    // Financial metrics
    const totalMoneyProcessed = bills.reduce((sum, b) => sum + b.totalAmount, 0)
    const averageBillValue = totalBills > 0 ? totalMoneyProcessed / totalBills : 0
    const largestBill = bills.reduce((max, b) => Math.max(max, b.totalAmount), 0)
    const totalTaxCollected = bills.reduce((sum, b) => sum + (parseFloat(b.bill.tax) || 0), 0)
    const totalTipsProcessed = bills.reduce((sum, b) => sum + (parseFloat(b.bill.tip) || 0), 0)
    const totalDiscountsGiven = bills.reduce((sum, b) => sum + (parseFloat(b.bill.discount) || 0), 0)
    
    // Time-based analytics
    const billsCreatedToday = bills.filter(b => new Date(b.createdAt) >= todayStart).length
    const billsCreatedThisWeek = bills.filter(b => new Date(b.createdAt) >= weekStart).length
    const billsCreatedThisMonth = bills.filter(b => new Date(b.createdAt) >= monthStart).length
    
    // Engagement metrics
    const sharedBills = bills.filter(b => b.accessCount > 0).length
    const shareRate = totalBills > 0 ? (sharedBills / totalBills) * 100 : 0
    const completionRate = totalBills > 0 ? (closedBills / totalBills) * 100 : 0
    
    // Averages
    const totalItems = bills.reduce((sum, b) => sum + (b.bill.items?.length || 0), 0)
    const totalPeople = bills.reduce((sum, b) => sum + (b.bill.people?.length || 0), 0)
    const averageItemsPerBill = totalBills > 0 ? totalItems / totalBills : 0
    const averagePeoplePerBill = totalBills > 0 ? totalPeople / totalBills : 0
    
    // Split method analysis
    const splitMethodCounts: Record<string, number> = {}
    let totalMethodCount = 0
    
    bills.forEach(bill => {
      bill.bill.items?.forEach(item => {
        const method = item.method || 'even'
        splitMethodCounts[method] = (splitMethodCounts[method] || 0) + 1
        totalMethodCount++
      })
    })
    
    const popularSplitMethods = Object.entries(splitMethodCounts)
      .map(([method, count]) => ({
        method,
        count,
        percentage: totalMethodCount > 0 ? (count / totalMethodCount) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4) // Top 4 methods
    
    const stats = {
      // Original stats
      totalBills,
      activeBills,
      draftBills,
      closedBills,
      totalItems,
      totalPeople,
      totalStorageSize: bills.reduce((sum, b) => sum + b.size, 0),
      averageBillSize: totalBills > 0 ? Math.round(bills.reduce((sum, b) => sum + b.size, 0) / totalBills) : 0,
      
      // Phase 1 enhancements
      totalMoneyProcessed,
      averageBillValue,
      largestBill,
      billsCreatedToday,
      billsCreatedThisWeek,
      billsCreatedThisMonth,
      completionRate,
      shareRate,
      averageItemsPerBill,
      averagePeoplePerBill,
      popularSplitMethods,
      totalTaxCollected,
      totalTipsProcessed,
      totalDiscountsGiven
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