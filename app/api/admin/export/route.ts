import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { getBillStore } from '@/lib/bill-store'
import type { Bill } from '@/lib/bill-types'

interface BillExportMetadata {
  id: string
  bill: Bill
  createdAt: string
  lastModified: string
  expiresAt: string
}

function convertToCSV(bills: BillExportMetadata[]): string {
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
    const searchParams = req.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'

    const store = await getBillStore()
    const bills = (await store.listBills()).map((record) => ({
      id: record.id,
      bill: record.bill,
      createdAt: record.createdAt,
      lastModified: record.lastModified,
      expiresAt: record.expiresAt,
    }))

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
