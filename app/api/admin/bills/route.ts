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
  lastAccessed?: string
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
        // For bills without timestamps, estimate based on Redis key order or use a reasonable fallback
        const estimatedCreatedAt = billData.createdAt || 
          (ttl > 0 ? new Date(Date.now() - (30 * 24 * 60 * 60 * 1000 - ttl * 1000)).toISOString() : 
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Default to 1 week ago
          
        const metadata: BillMetadata = {
          id,
          bill: billData,
          createdAt: estimatedCreatedAt,
          lastModified: billData.lastModified || estimatedCreatedAt,
          expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : 'Never',
          accessCount: billData.accessCount || 0,
          size: JSON.stringify(billData).length,
          shareUrl: `${getBaseUrl(req)}?share=${id}`,
          totalAmount: billSummary.total,
          lastAccessed: billData.lastAccessed
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

    // Enhanced Statistics Calculation with Accuracy Fixes
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    // Basic counts
    const totalBills = bills.length
    const activeBills = bills.filter(b => b.bill.status === 'active').length
    const draftBills = bills.filter(b => b.bill.status === 'draft').length
    const closedBills = bills.filter(b => b.bill.status === 'closed').length
    
    // Enhanced Financial metrics with proper calculations
    const totalMoneyProcessed = bills.reduce((sum, b) => sum + b.totalAmount, 0)
    const averageBillValue = totalBills > 0 ? totalMoneyProcessed / totalBills : 0
    const medianBillValue = totalBills > 0 ? getMedian(bills.map(b => b.totalAmount)) : 0
    const largestBill = bills.reduce((max, b) => Math.max(max, b.totalAmount), 0)
    const smallestBill = totalBills > 0 ? bills.reduce((min, b) => Math.min(min, b.totalAmount), Infinity) : 0
    
    // Accurate tax/tip/discount calculations
    const totalTaxCollected = bills.reduce((sum, b) => sum + (parseFloat(b.bill.tax) || 0), 0)
    const totalTipsProcessed = bills.reduce((sum, b) => sum + (parseFloat(b.bill.tip) || 0), 0)
    const totalDiscountsApplied = bills.reduce((sum, b) => sum + (parseFloat(b.bill.discount) || 0), 0)
    
    // Revenue breakdown
    const subtotalRevenue = totalMoneyProcessed - totalTaxCollected - totalTipsProcessed + totalDiscountsApplied
    const taxRevenue = totalTaxCollected
    const tipRevenue = totalTipsProcessed
    
    // Time-based analytics with trends (fixed date handling)
    const billsCreatedToday = bills.filter(b => {
      if (!b.createdAt) return false
      const created = new Date(b.createdAt)
      return !isNaN(created.getTime()) && created >= todayStart
    }).length
    
    const billsCreatedThisWeek = bills.filter(b => {
      if (!b.createdAt) return false
      const created = new Date(b.createdAt)
      return !isNaN(created.getTime()) && created >= weekStart
    }).length
    
    const billsCreatedThisMonth = bills.filter(b => {
      if (!b.createdAt) return false
      const created = new Date(b.createdAt)
      return !isNaN(created.getTime()) && created >= monthStart
    }).length
    
    const billsCreatedLastWeek = bills.filter(b => {
      if (!b.createdAt) return false
      const created = new Date(b.createdAt)
      return !isNaN(created.getTime()) && created >= lastWeekStart && created < weekStart
    }).length
    
    const billsCreatedLastMonth = bills.filter(b => {
      if (!b.createdAt) return false
      const created = new Date(b.createdAt)
      return !isNaN(created.getTime()) && created >= lastMonthStart && created < monthStart
    }).length
    
    // Growth calculations
    const weeklyGrowth = billsCreatedLastWeek > 0 ? 
      ((billsCreatedThisWeek - billsCreatedLastWeek) / billsCreatedLastWeek) * 100 : 
      billsCreatedThisWeek > 0 ? 100 : 0
    const monthlyGrowth = billsCreatedLastMonth > 0 ? 
      ((billsCreatedThisMonth - billsCreatedLastMonth) / billsCreatedLastMonth) * 100 : 
      billsCreatedThisMonth > 0 ? 100 : 0
    
    // Enhanced engagement metrics (fixed logic)
    // A bill is considered "shared" if it has people (collaborative) or has been accessed multiple times
    const sharedBills = bills.filter(b => {
      const hasMultiplePeople = (b.bill.people?.length || 0) > 1
      const hasMultipleAccesses = (b.accessCount || 0) > 1
      const hasItems = (b.bill.items?.length || 0) > 0
      return hasItems && (hasMultiplePeople || hasMultipleAccesses)
    }).length
    
    const shareRate = totalBills > 0 ? (sharedBills / totalBills) * 100 : 0
    
    // A bill is "completed" if it has items, people, and is marked as closed OR has significant activity
    const completedBills = bills.filter(b => {
      const hasContent = (b.bill.items?.length || 0) > 0 && (b.bill.people?.length || 0) > 0
      const isMarkedClosed = b.bill.status === 'closed'
      const hasActivity = (b.accessCount || 0) > 0
      return hasContent && (isMarkedClosed || hasActivity)
    }).length
    
    const completionRate = totalBills > 0 ? (completedBills / totalBills) * 100 : 0
    const averageAccessCount = totalBills > 0 ? bills.reduce((sum, b) => sum + (b.accessCount || 0), 0) / totalBills : 0
    
    // Usage analytics
    const totalItems = bills.reduce((sum, b) => sum + (b.bill.items?.length || 0), 0)
    const totalPeople = bills.reduce((sum, b) => sum + (b.bill.people?.length || 0), 0)
    const averageItemsPerBill = totalBills > 0 ? totalItems / totalBills : 0
    const averagePeoplePerBill = totalBills > 0 ? totalPeople / totalBills : 0
    
    // Bills with various characteristics
    const billsWithTax = bills.filter(b => parseFloat(b.bill.tax) > 0).length
    const billsWithTips = bills.filter(b => parseFloat(b.bill.tip) > 0).length
    const billsWithDiscounts = bills.filter(b => parseFloat(b.bill.discount) > 0).length
    const complexBills = bills.filter(b => (b.bill.items?.length || 0) > 5).length
    const largeBills = bills.filter(b => (b.bill.people?.length || 0) > 4).length
    
    // Split method analysis (corrected)
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
    
    // Helper function for median calculation
    function getMedian(values: number[]): number {
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid]
    }
    
    // Debug logging (remove in production)
    console.log('Admin Stats Debug:', {
      totalBills,
      sampleBill: bills[0] ? {
        id: bills[0].id,
        createdAt: bills[0].createdAt,
        status: bills[0].bill.status,
        accessCount: bills[0].accessCount,
        itemsCount: bills[0].bill.items?.length,
        peopleCount: bills[0].bill.people?.length
      } : null,
      todayStart: todayStart.toISOString(),
      weekStart: weekStart.toISOString(),
      monthStart: monthStart.toISOString(),
      billsCreatedToday,
      billsCreatedThisWeek,
      billsCreatedThisMonth,
      sharedBills,
      completedBills
    })

    const stats = {
      // Core metrics
      totalBills,
      activeBills,
      draftBills,
      closedBills,
      totalItems,
      totalPeople,
      totalStorageSize: bills.reduce((sum, b) => sum + b.size, 0),
      averageBillSize: totalBills > 0 ? Math.round(bills.reduce((sum, b) => sum + b.size, 0) / totalBills) : 0,
      
      // Enhanced financial metrics
      totalMoneyProcessed: Math.round(totalMoneyProcessed * 100) / 100,
      averageBillValue: Math.round(averageBillValue * 100) / 100,
      medianBillValue: Math.round(medianBillValue * 100) / 100,
      largestBill: Math.round(largestBill * 100) / 100,
      smallestBill: Math.round(smallestBill * 100) / 100,
      subtotalRevenue: Math.round(subtotalRevenue * 100) / 100,
      taxRevenue: Math.round(taxRevenue * 100) / 100,
      tipRevenue: Math.round(tipRevenue * 100) / 100,
      
      // Tax/Tip/Discount breakdown
      totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
      totalTipsProcessed: Math.round(totalTipsProcessed * 100) / 100,
      totalDiscountsApplied: Math.round(totalDiscountsApplied * 100) / 100,
      billsWithTax,
      billsWithTips,
      billsWithDiscounts,
      
      // Time-based analytics with trends
      billsCreatedToday,
      billsCreatedThisWeek,
      billsCreatedThisMonth,
      billsCreatedLastWeek,
      billsCreatedLastMonth,
      weeklyGrowth: Math.round(weeklyGrowth * 10) / 10, // Round to 1 decimal
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
      
      // Enhanced engagement metrics
      completionRate: Math.round(completionRate * 10) / 10,
      shareRate: Math.round(shareRate * 10) / 10,
      averageAccessCount: Math.round(averageAccessCount * 10) / 10,
      sharedBills,
      completedBills,
      
      // Usage analytics
      averageItemsPerBill: Math.round(averageItemsPerBill * 10) / 10,
      averagePeoplePerBill: Math.round(averagePeoplePerBill * 10) / 10,
      complexBills, // Bills with >5 items
      largeBills,   // Bills with >4 people
      
      // Split method preferences
      popularSplitMethods: popularSplitMethods.map(method => ({
        ...method,
        percentage: Math.round(method.percentage * 10) / 10
      }))
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