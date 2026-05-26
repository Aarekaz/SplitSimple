import { NextRequest } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { proxyToBackend } from '@/lib/backend-proxy'

async function getAllBillsHandler(req: NextRequest) {
  return proxyToBackend(req, '/api/admin/bills')
}

export const GET = adminAuthMiddleware(getAllBillsHandler)
