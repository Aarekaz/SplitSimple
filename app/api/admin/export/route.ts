import { NextRequest } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { proxyToBackend } from '@/lib/backend-proxy'

async function exportBillsHandler(req: NextRequest) {
  return proxyToBackend(req, '/api/admin/export')
}

export const GET = adminAuthMiddleware(exportBillsHandler)
