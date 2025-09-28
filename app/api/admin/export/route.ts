import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { executeRedisOperation } from '@/lib/redis-pool'
import { validateEnvironment } from '@/lib/env-validation'
import type { Bill } from '@/contexts/BillContext'

function convertToCSV(bills: any[]): string {
  if (bills.length === 0) return ''

  const headers = [
    'ID',
    'Title',
    'Status',
    'Created At',
    'Last Modified',
    'Total Items',
    'Total People',
    'Tax',
    'Tip',
    'Discount',
    'Notes'
  ]

  const rows = bills.map(b => [
    b.id,
    b.bill.title || '',
    b.bill.status || '',
    b.createdAt || '',
    b.lastModified || '',
    b.bill.items?.length || 0,
    b.bill.people?.length || 0,
    b.bill.tax || '0',
    b.bill.tip || '0',
    b.bill.discount || '0',
    b.bill.notes || ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

async function exportBillsHandler(req: NextRequest) {
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
    const format = searchParams.get('format') || 'json'

    // Get all bills
    const keys = await executeRedisOperation(async (redis) => {
      return redis.keys('bill:*')
    })

    const billsPromises = keys.map(async (key) => {
      const [billData, ttl] = await executeRedisOperation(async (redis) => {
        const data = await redis.get(key)
        const ttlValue = await redis.ttl(key)
        return [data ? JSON.parse(data) : null, ttlValue]
      })

      if (billData) {
        const id = key.replace('bill:', '')
        return {
          id,
          bill: billData,
          createdAt: billData.createdAt || new Date().toISOString(),
          lastModified: billData.lastModified || new Date().toISOString(),
          expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : 'Never'
        }
      }
      return null
    })

    const bills = (await Promise.all(billsPromises)).filter(b => b !== null)

    if (format === 'csv') {
      const csv = convertToCSV(bills)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="bills_export_${new Date().toISOString()}.csv"`
        }
      })
    }

    // JSON format
    const jsonData = JSON.stringify(bills, null, 2)
    return new NextResponse(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bills_export_${new Date().toISOString()}.json"`
      }
    })
  } catch (error) {
    console.error('Error exporting bills:', error)
    return NextResponse.json(
      { error: 'Failed to export bills' },
      { status: 500 }
    )
  }
}

export const GET = adminAuthMiddleware(exportBillsHandler)