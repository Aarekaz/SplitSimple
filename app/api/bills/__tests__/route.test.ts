/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../[id]/route'
import { createMockBill } from '../../../../tests/utils/test-utils'
import type { BillRecord } from '@/lib/bill-store'

interface BillResponse {
  bill?: unknown
  error?: string
  success?: boolean
  message?: string
  billId?: string
}

const mockStore = {
  getBill: jest.fn(),
  saveBill: jest.fn(),
}

jest.mock('@/lib/bill-store', () => ({
  getBillStore: jest.fn(() => Promise.resolve(mockStore)),
}))

function createMockBillRecord(overrides: Partial<BillRecord> = {}): BillRecord {
  const bill = overrides.bill || createMockBill({ id: overrides.id || 'test-id' })

  return {
    id: bill.id,
    bill,
    createdAt: bill.createdAt || '2026-01-01T00:00:00.000Z',
    lastModified: bill.lastModified || '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-07-01T00:00:00.000Z',
    accessCount: bill.accessCount || 0,
    size: JSON.stringify(bill).length,
    ttl: 15552000,
    ...overrides,
  }
}

async function readBillResponse(response: Response): Promise<BillResponse> {
  return await response.json() as BillResponse
}

describe('/api/bills/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/bills/[id]', () => {
    it('retrieves an existing bill successfully', async () => {
      const testBill = createMockBill({
        id: 'test-id',
        title: 'Test Bill',
        people: [],
        items: [],
      })

      mockStore.getBill.mockResolvedValue(createMockBillRecord({ id: 'test-id', bill: testBill }))

      const request = new NextRequest('http://localhost:3000/api/bills/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await GET(request, { params })

      expect(response.status).toBe(200)

      const data = await readBillResponse(response)
      expect(data.bill).toEqual(testBill)
      expect(mockStore.getBill).toHaveBeenCalledWith('test-id', { incrementAccess: true })
    })

    it('returns 404 when bill is not found', async () => {
      mockStore.getBill.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bills/nonexistent')
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await GET(request, { params })

      expect(response.status).toBe(404)

      const data = await readBillResponse(response)
      expect(data.error).toBe('Bill not found or expired')
    })

    it('returns 400 for an invalid bill ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/bills/')
      const params = Promise.resolve({ id: '' })
      const response = await GET(request, { params })

      expect(response.status).toBe(400)

      const data = await readBillResponse(response)
      expect(data.error).toBe('Invalid bill ID')
    })

    it('handles D1 lookup errors', async () => {
      mockStore.getBill.mockRejectedValue(new Error('D1 failed'))

      const request = new NextRequest('http://localhost:3000/api/bills/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await GET(request, { params })

      expect(response.status).toBe(500)

      const data = await readBillResponse(response)
      expect(data.error).toBe('Failed to retrieve bill')
    })
  })

  describe('POST /api/bills/[id]', () => {
    it('stores a bill successfully', async () => {
      const testBill = createMockBill({
        id: 'test-bill-id',
        title: 'Test Bill',
        people: [],
        items: [],
      })

      mockStore.saveBill.mockResolvedValue(createMockBillRecord({ id: 'test-bill-id', bill: testBill }))

      const request = new NextRequest('http://localhost:3000/api/bills/test-bill-id', {
        method: 'POST',
        body: JSON.stringify({ bill: testBill }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const params = Promise.resolve({ id: 'test-bill-id' })
      const response = await POST(request, { params })

      expect(response.status).toBe(200)

      const data = await readBillResponse(response)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Bill stored successfully')
      expect(data.billId).toBe('test-bill-id')

      expect(mockStore.saveBill).toHaveBeenCalledWith(
        'test-bill-id',
        expect.objectContaining({
          id: 'test-bill-id',
          title: 'Test Bill',
          accessCount: 0,
          createdAt: expect.any(String),
          lastModified: expect.any(String),
        })
      )
    })

    it('returns 400 for an invalid bill ID', async () => {
      const testBill = createMockBill()

      const request = new NextRequest('http://localhost:3000/api/bills/', {
        method: 'POST',
        body: JSON.stringify({ bill: testBill }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const params = Promise.resolve({ id: '' })
      const response = await POST(request, { params })

      expect(response.status).toBe(400)

      const data = await readBillResponse(response)
      expect(data.error).toBe('Invalid bill ID')
    })

    it('returns 400 for missing bill data', async () => {
      const request = new NextRequest('http://localhost:3000/api/bills/test-id', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await POST(request, { params })

      expect(response.status).toBe(400)

      const data = await readBillResponse(response)
      expect(data.error).toBe('Invalid bill data')
    })

    it('returns 400 for an invalid bill data type', async () => {
      const request = new NextRequest('http://localhost:3000/api/bills/test-id', {
        method: 'POST',
        body: JSON.stringify({ bill: 'invalid' }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await POST(request, { params })

      expect(response.status).toBe(400)

      const data = await readBillResponse(response)
      expect(data.error).toBe('Invalid bill data')
    })

    it('returns 400 for invalid JSON in the request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/bills/test-id', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await POST(request, { params })

      expect(response.status).toBe(400)

      const data = await readBillResponse(response)
      expect(data.error).toBe('Invalid JSON body')
    })

    it('handles D1 storage errors', async () => {
      const testBill = createMockBill()
      mockStore.saveBill.mockRejectedValue(new Error('Storage failed'))

      const request = new NextRequest('http://localhost:3000/api/bills/test-id', {
        method: 'POST',
        body: JSON.stringify({ bill: testBill }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await POST(request, { params })

      expect(response.status).toBe(500)

      const data = await readBillResponse(response)
      expect(data.error).toBe('Failed to store bill')
    })
  })
})
