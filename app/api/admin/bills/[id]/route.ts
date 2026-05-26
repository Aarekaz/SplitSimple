import { NextRequest } from 'next/server'
import { adminAuthMiddleware } from '@/lib/admin-auth'
import { proxyToBackend } from '@/lib/backend-proxy'

async function getBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(req, `/api/admin/bills/${encodeURIComponent(id)}`)
}

async function updateBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(req, `/api/admin/bills/${encodeURIComponent(id)}`)
}

async function deleteBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(req, `/api/admin/bills/${encodeURIComponent(id)}`)
}

async function extendBillHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(req, `/api/admin/bills/${encodeURIComponent(id)}`)
}

export const GET = adminAuthMiddleware(getBillHandler)
export const PUT = adminAuthMiddleware(updateBillHandler)
export const DELETE = adminAuthMiddleware(deleteBillHandler)
export const PATCH = adminAuthMiddleware(extendBillHandler)
