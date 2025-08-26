import { http, HttpResponse } from 'msw'
import type { Bill } from '@/contexts/BillContext'

// Mock Redis storage for testing
const mockBillStorage = new Map<string, Bill>()

export const handlers = [
  // GET /api/bills/[id] - Retrieve a shared bill
  http.get('/api/bills/:id', async ({ params }) => {
    const { id } = params
    
    if (typeof id !== 'string') {
      return HttpResponse.json(
        { error: 'Invalid bill ID' },
        { status: 400 }
      )
    }

    const bill = mockBillStorage.get(id)
    
    if (!bill) {
      return HttpResponse.json(
        { error: 'Bill not found or expired' },
        { status: 404 }
      )
    }

    return HttpResponse.json({ bill })
  }),

  // POST /api/bills/[id] - Store a bill for sharing
  http.post('/api/bills/:id', async ({ request, params }) => {
    const { id } = params
    
    if (typeof id !== 'string') {
      return HttpResponse.json(
        { error: 'Invalid bill ID' },
        { status: 400 }
      )
    }

    try {
      const body = await request.json() as { bill: Bill }
      const bill = body.bill

      if (!bill || typeof bill !== 'object') {
        return HttpResponse.json(
          { error: 'Invalid bill data' },
          { status: 400 }
        )
      }

      // Store in mock storage
      mockBillStorage.set(id, bill)

      return HttpResponse.json({ 
        success: true,
        message: 'Bill stored successfully',
        billId: id 
      })
    } catch (error) {
      return HttpResponse.json(
        { error: 'Failed to store bill' },
        { status: 500 }
      )
    }
  }),
]

// Utility functions for tests
export const mockBillUtils = {
  clear: () => mockBillStorage.clear(),
  set: (id: string, bill: Bill) => mockBillStorage.set(id, bill),
  get: (id: string) => mockBillStorage.get(id),
  has: (id: string) => mockBillStorage.has(id),
}