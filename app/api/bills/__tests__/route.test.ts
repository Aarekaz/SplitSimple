/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '../[id]/route'

const mockProxyToBackend = jest.fn()

jest.mock('@/lib/backend-proxy', () => ({
  proxyToBackend: (...args: unknown[]) => mockProxyToBackend(...args),
}))

describe('/api/bills/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('proxies GET requests to the backend bill endpoint', async () => {
    mockProxyToBackend.mockResolvedValue(Response.json({ ok: true }, { status: 200 }))

    const request = new NextRequest('http://localhost:3000/api/bills/test-id?share=1')
    const params = Promise.resolve({ id: 'test-id' })
    const response = await GET(request, { params })

    expect(mockProxyToBackend).toHaveBeenCalledWith(request, '/api/bills/test-id')
    expect(response.status).toBe(200)
  })

  it('proxies POST requests to the backend bill endpoint', async () => {
    mockProxyToBackend.mockResolvedValue(Response.json({ success: true }, { status: 200 }))

    const request = new NextRequest('http://localhost:3000/api/bills/test-id', {
      method: 'POST',
      body: JSON.stringify({ bill: { id: 'test-id' } }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const params = Promise.resolve({ id: 'test-id' })
    const response = await POST(request, { params })

    expect(mockProxyToBackend).toHaveBeenCalledWith(request, '/api/bills/test-id')
    expect(response.status).toBe(200)
  })
})
