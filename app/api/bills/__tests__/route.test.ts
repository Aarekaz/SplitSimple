/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../[id]/route'
import { createMockBill } from '../../../../tests/utils/test-utils'
import { STORAGE } from '@/lib/constants'

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  isOpen: false,
}

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}))

// Mock environment variable
const originalEnv = process.env
beforeAll(() => {
  process.env = {
    ...originalEnv,
    REDIS_URL: 'redis://localhost:6379',
  }
})

afterAll(() => {
  process.env = originalEnv
})

describe('/api/bills/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedisClient.isOpen = false
  })

  describe('GET /api/bills/[id]', () => {
    it('should retrieve existing bill successfully', async () => {
      const testBill = createMockBill({
        title: 'Test Bill',
        people: [],
        items: [],
      })

      mockRedisClient.get.mockResolvedValue(JSON.stringify(testBill))

      const request = new NextRequest('http://localhost:3000/api/bills/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await GET(request, { params })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.bill).toEqual(testBill)
      expect(mockRedisClient.connect).toHaveBeenCalled()
      expect(mockRedisClient.get).toHaveBeenCalledWith('bill:test-id')
      expect(mockRedisClient.disconnect).toHaveBeenCalled()
    })

    it('should return 404 when bill not found', async () => {
      mockRedisClient.get.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bills/nonexistent')
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await GET(request, { params })

      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error).toBe('Bill not found or expired')
    })

    it('should return 400 for invalid bill ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/bills/')
      const params = Promise.resolve({ id: '' })
      const response = await GET(request, { params })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid bill ID')
    })

    it('should handle Redis connection errors', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'))

      const request = new NextRequest('http://localhost:3000/api/bills/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await GET(request, { params })

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve bill')
    })

    it('should handle invalid JSON data', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json')

      const request = new NextRequest('http://localhost:3000/api/bills/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await GET(request, { params })

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to retrieve bill')
    })
  })

  describe('POST /api/bills/[id]', () => {
    it('should store bill successfully', async () => {
      const testBill = createMockBill({
        id: 'test-bill-id',
        title: 'Test Bill',
        people: [],
        items: [],
      })

      mockRedisClient.setEx.mockResolvedValue('OK')

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
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toBe('Bill stored successfully')
      expect(data.billId).toBe('test-bill-id')
      
      expect(mockRedisClient.connect).toHaveBeenCalled()
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'bill:test-bill-id',
        STORAGE.BILL_TTL_SECONDS,
        JSON.stringify(testBill)
      )
      expect(mockRedisClient.disconnect).toHaveBeenCalled()
    })

    it('should return 400 for invalid bill ID', async () => {
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
      
      const data = await response.json()
      expect(data.error).toBe('Invalid bill ID')
    })

    it('should return 400 for missing bill data', async () => {
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
      
      const data = await response.json()
      expect(data.error).toBe('Invalid bill data')
    })

    it('should return 400 for invalid bill data type', async () => {
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
      
      const data = await response.json()
      expect(data.error).toBe('Invalid bill data')
    })

    it('should handle Redis storage errors', async () => {
      const testBill = createMockBill()
      mockRedisClient.setEx.mockRejectedValue(new Error('Storage failed'))

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
      
      const data = await response.json()
      expect(data.error).toBe('Failed to store bill')
    })

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/bills/test-id', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const params = Promise.resolve({ id: 'test-id' })
      const response = await POST(request, { params })

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to store bill')
    })

    it('should handle missing Redis URL environment variable', async () => {
      // Temporarily remove REDIS_URL
      delete process.env.REDIS_URL

      const testBill = createMockBill()
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
      
      const data = await response.json()
      expect(data.error).toBe('Failed to store bill')

      // Restore environment variable
      process.env.REDIS_URL = 'redis://localhost:6379'
    })

    it('should store bill with correct expiration time', async () => {
      const testBill = createMockBill()
      mockRedisClient.setEx.mockResolvedValue('OK')

      const request = new NextRequest('http://localhost:3000/api/bills/test-id', {
        method: 'POST',
        body: JSON.stringify({ bill: testBill }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const params = Promise.resolve({ id: 'test-id' })
      await POST(request, { params })

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'bill:test-id',
        STORAGE.BILL_TTL_SECONDS,
        expect.any(String)
      )
    })
  })

  describe('Redis client management', () => {
    it('should connect to Redis when not open', async () => {
      mockRedisClient.isOpen = false
      mockRedisClient.get.mockResolvedValue(JSON.stringify(createMockBill()))

      const request = new NextRequest('http://localhost:3000/api/bills/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      await GET(request, { params })

      expect(mockRedisClient.connect).toHaveBeenCalled()
    })

    it('should not connect to Redis when already open', async () => {
      mockRedisClient.isOpen = true
      mockRedisClient.get.mockResolvedValue(JSON.stringify(createMockBill()))

      const request = new NextRequest('http://localhost:3000/api/bills/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      await GET(request, { params })

      expect(mockRedisClient.connect).not.toHaveBeenCalled()
    })

    it('should always disconnect after operation', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(createMockBill()))

      const request = new NextRequest('http://localhost:3000/api/bills/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      await GET(request, { params })

      expect(mockRedisClient.disconnect).toHaveBeenCalled()
    })
  })
})
